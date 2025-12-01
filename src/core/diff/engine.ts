/**
 * Workflow Diff Engine
 * Applies diff operations to n8n workflows
 * Ported from n8n-mcp/src/services/workflow-diff-engine.ts
 */

import { randomUUID } from 'node:crypto';
import type { Workflow, WorkflowNode } from '../../types/n8n-api.js';
import type {
  WorkflowDiffOperation,
  WorkflowDiffRequest,
  WorkflowDiffResult,
  WorkflowDiffValidationError,
  AddNodeOperation,
  RemoveNodeOperation,
  UpdateNodeOperation,
  MoveNodeOperation,
  EnableNodeOperation,
  DisableNodeOperation,
  AddConnectionOperation,
  RemoveConnectionOperation,
  RewireConnectionOperation,
  UpdateSettingsOperation,
  UpdateNameOperation,
  AddTagOperation,
  RemoveTagOperation,
  CleanStaleConnectionsOperation,
  ReplaceConnectionsOperation,
} from '../../types/workflow-diff.js';
import { debug } from '../debug.js';
import { sanitizeNode } from './sanitizer.js';
import { isActivatableTrigger } from './utils.js';

export class WorkflowDiffEngine {
  // Track node name changes during operations for connection reference updates
  private renameMap: Map<string, string> = new Map();
  // Track warnings during operation processing
  private warnings: WorkflowDiffValidationError[] = [];

  /**
   * Apply diff operations to a workflow
   */
  async applyDiff(
    workflow: Workflow,
    request: WorkflowDiffRequest
  ): Promise<WorkflowDiffResult> {
    try {
      // Reset tracking for this diff operation
      this.renameMap.clear();
      this.warnings = [];

      // Clone workflow to avoid modifying original
      const workflowCopy = JSON.parse(JSON.stringify(workflow)) as Workflow;

      // Group operations by type for two-pass processing
      const nodeOperationTypes = ['addNode', 'removeNode', 'updateNode', 'moveNode', 'enableNode', 'disableNode'];
      const nodeOperations: Array<{ operation: WorkflowDiffOperation; index: number }> = [];
      const otherOperations: Array<{ operation: WorkflowDiffOperation; index: number }> = [];

      request.operations.forEach((operation, index) => {
        if (nodeOperationTypes.includes(operation.type)) {
          nodeOperations.push({ operation, index });
        } else {
          otherOperations.push({ operation, index });
        }
      });

      const allOperations = [...nodeOperations, ...otherOperations];
      const errors: WorkflowDiffValidationError[] = [];
      const appliedIndices: number[] = [];
      const failedIndices: number[] = [];

      // Process based on mode
      if (request.continueOnError) {
        // Best-effort mode: continue even if some operations fail
        for (const { operation, index } of allOperations) {
          const error = this.validateOperation(workflowCopy, operation);
          if (error) {
            errors.push({
              operation: index,
              message: error,
              details: operation
            });
            failedIndices.push(index);
            continue;
          }

          try {
            this.applyOperation(workflowCopy, operation);
            appliedIndices.push(index);
          } catch (err) {
            const errorMsg = `Failed to apply operation: ${err instanceof Error ? err.message : 'Unknown error'}`;
            errors.push({
              operation: index,
              message: errorMsg,
              details: operation
            });
            failedIndices.push(index);
          }
        }

        // Update connection references after all node renames
        if (this.renameMap.size > 0 && appliedIndices.length > 0) {
          this.updateConnectionReferences(workflowCopy);
          debug('diff', `Auto-updated ${this.renameMap.size} node name references in connections (continueOnError mode)`);
        }

        // If validateOnly flag is set, return success without applying
        if (request.validateOnly) {
          return {
            success: errors.length === 0,
            message: errors.length === 0
              ? 'Validation successful. All operations are valid.'
              : `Validation completed with ${errors.length} errors.`,
            errors: errors.length > 0 ? errors : undefined,
            warnings: this.warnings.length > 0 ? this.warnings : undefined,
            applied: appliedIndices,
            failed: failedIndices
          };
        }

        const success = appliedIndices.length > 0;
        return {
          success,
          workflow: workflowCopy,
          operationsApplied: appliedIndices.length,
          message: `Applied ${appliedIndices.length} operations, ${failedIndices.length} failed (continueOnError mode)`,
          errors: errors.length > 0 ? errors : undefined,
          warnings: this.warnings.length > 0 ? this.warnings : undefined,
          applied: appliedIndices,
          failed: failedIndices
        };
      } else {
        // Atomic mode: all operations must succeed
        // Pass 1: Validate and apply node operations first
        for (const { operation, index } of nodeOperations) {
          const error = this.validateOperation(workflowCopy, operation);
          if (error) {
            return {
              success: false,
              errors: [{
                operation: index,
                message: error,
                details: operation
              }]
            };
          }

          try {
            this.applyOperation(workflowCopy, operation);
          } catch (err) {
            return {
              success: false,
              errors: [{
                operation: index,
                message: `Failed to apply operation: ${err instanceof Error ? err.message : 'Unknown error'}`,
                details: operation
              }]
            };
          }
        }

        // Update connection references after all node renames
        if (this.renameMap.size > 0) {
          this.updateConnectionReferences(workflowCopy);
          debug('diff', `Auto-updated ${this.renameMap.size} node name references in connections`);
        }

        // Pass 2: Validate and apply other operations (connections, metadata)
        for (const { operation, index } of otherOperations) {
          const error = this.validateOperation(workflowCopy, operation);
          if (error) {
            return {
              success: false,
              errors: [{
                operation: index,
                message: error,
                details: operation
              }]
            };
          }

          try {
            this.applyOperation(workflowCopy, operation);
          } catch (err) {
            return {
              success: false,
              errors: [{
                operation: index,
                message: `Failed to apply operation: ${err instanceof Error ? err.message : 'Unknown error'}`,
                details: operation
              }]
            };
          }
        }

        // Sanitize ALL nodes in the workflow after operations are applied
        workflowCopy.nodes = workflowCopy.nodes.map((node: WorkflowNode) => sanitizeNode(node));
        debug('diff', 'Applied full-workflow sanitization to all nodes');

        // If validateOnly flag is set, return success without applying
        if (request.validateOnly) {
          return {
            success: true,
            message: 'Validation successful. Operations are valid but not applied.'
          };
        }

        const operationsApplied = request.operations.length;

        // Extract activation flags from workflow object
        const shouldActivate = (workflowCopy as any)._shouldActivate === true;
        const shouldDeactivate = (workflowCopy as any)._shouldDeactivate === true;

        // Clean up temporary flags
        delete (workflowCopy as any)._shouldActivate;
        delete (workflowCopy as any)._shouldDeactivate;

        return {
          success: true,
          workflow: workflowCopy,
          operationsApplied,
          message: `Successfully applied ${operationsApplied} operations (${nodeOperations.length} node ops, ${otherOperations.length} other ops)`,
          warnings: this.warnings.length > 0 ? this.warnings : undefined,
          shouldActivate: shouldActivate || undefined,
          shouldDeactivate: shouldDeactivate || undefined
        };
      }
    } catch (err) {
      debug('diff', `Failed to apply diff: ${err}`);
      return {
        success: false,
        errors: [{
          operation: -1,
          message: `Diff engine error: ${err instanceof Error ? err.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Validate a single operation
   */
  private validateOperation(workflow: Workflow, operation: WorkflowDiffOperation): string | null {
    switch (operation.type) {
      case 'addNode':
        return this.validateAddNode(workflow, operation);
      case 'removeNode':
        return this.validateRemoveNode(workflow, operation);
      case 'updateNode':
        return this.validateUpdateNode(workflow, operation);
      case 'moveNode':
        return this.validateMoveNode(workflow, operation);
      case 'enableNode':
      case 'disableNode':
        return this.validateToggleNode(workflow, operation);
      case 'addConnection':
        return this.validateAddConnection(workflow, operation);
      case 'removeConnection':
        return this.validateRemoveConnection(workflow, operation);
      case 'rewireConnection':
        return this.validateRewireConnection(workflow, operation as RewireConnectionOperation);
      case 'updateSettings':
      case 'updateName':
      case 'addTag':
      case 'removeTag':
        return null; // These are always valid
      case 'activateWorkflow':
        return this.validateActivateWorkflow(workflow);
      case 'deactivateWorkflow':
        return null; // Deactivation is always valid
      case 'cleanStaleConnections':
        return null; // Always valid - just cleans up
      case 'replaceConnections':
        return this.validateReplaceConnections(workflow, operation as ReplaceConnectionsOperation);
      default:
        return `Unknown operation type: ${(operation as any).type}`;
    }
  }

  /**
   * Apply a single operation to the workflow
   */
  private applyOperation(workflow: Workflow, operation: WorkflowDiffOperation): void {
    switch (operation.type) {
      case 'addNode':
        this.applyAddNode(workflow, operation);
        break;
      case 'removeNode':
        this.applyRemoveNode(workflow, operation);
        break;
      case 'updateNode':
        this.applyUpdateNode(workflow, operation);
        break;
      case 'moveNode':
        this.applyMoveNode(workflow, operation);
        break;
      case 'enableNode':
        this.applyEnableNode(workflow, operation);
        break;
      case 'disableNode':
        this.applyDisableNode(workflow, operation);
        break;
      case 'addConnection':
        this.applyAddConnection(workflow, operation);
        break;
      case 'removeConnection':
        this.applyRemoveConnection(workflow, operation);
        break;
      case 'rewireConnection':
        this.applyRewireConnection(workflow, operation as RewireConnectionOperation);
        break;
      case 'updateSettings':
        this.applyUpdateSettings(workflow, operation);
        break;
      case 'updateName':
        this.applyUpdateName(workflow, operation);
        break;
      case 'addTag':
        this.applyAddTag(workflow, operation);
        break;
      case 'removeTag':
        this.applyRemoveTag(workflow, operation);
        break;
      case 'activateWorkflow':
        this.applyActivateWorkflow(workflow);
        break;
      case 'deactivateWorkflow':
        this.applyDeactivateWorkflow(workflow);
        break;
      case 'cleanStaleConnections':
        this.applyCleanStaleConnections(workflow, operation as CleanStaleConnectionsOperation);
        break;
      case 'replaceConnections':
        this.applyReplaceConnections(workflow, operation as ReplaceConnectionsOperation);
        break;
    }
  }

  // ===== Node operation validators =====
  
  private validateAddNode(workflow: Workflow, operation: AddNodeOperation): string | null {
    const { node } = operation;

    // Check if node with same name already exists
    const normalizedNewName = this.normalizeNodeName(node.name);
    const duplicate = workflow.nodes.find(n =>
      this.normalizeNodeName(n.name) === normalizedNewName
    );
    if (duplicate) {
      return `Node with name "${node.name}" already exists (normalized name matches existing node "${duplicate.name}")`;
    }
    
    // Validate node type format
    if (!node.type.includes('.')) {
      return `Invalid node type "${node.type}". Must include package prefix (e.g., "n8n-nodes-base.webhook")`;
    }
    
    if (node.type.startsWith('nodes-base.')) {
      return `Invalid node type "${node.type}". Use "n8n-nodes-base.${node.type.substring(11)}" instead`;
    }
    
    return null;
  }

  private validateRemoveNode(workflow: Workflow, operation: RemoveNodeOperation): string | null {
    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) {
      return this.formatNodeNotFoundError(workflow, operation.nodeId || operation.nodeName || '', 'removeNode');
    }
    return null;
  }

  private validateUpdateNode(workflow: Workflow, operation: UpdateNodeOperation): string | null {
    // Check for common parameter mistake: "changes" instead of "updates"
    const operationAny = operation as any;
    if (operationAny.changes && !operation.updates) {
      return `Invalid parameter 'changes'. The updateNode operation requires 'updates' (not 'changes'). Example: {type: "updateNode", nodeId: "abc", updates: {name: "New Name", "parameters.url": "https://example.com"}}`;
    }

    // Check for missing required parameter
    if (!operation.updates) {
      return `Missing required parameter 'updates'. The updateNode operation requires an 'updates' object containing properties to modify. Example: {type: "updateNode", nodeId: "abc", updates: {name: "New Name"}}`;
    }

    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) {
      return this.formatNodeNotFoundError(workflow, operation.nodeId || operation.nodeName || '', 'updateNode');
    }

    // Check for name collision if renaming
    if (operation.updates.name && operation.updates.name !== node.name) {
      const normalizedNewName = this.normalizeNodeName(operation.updates.name);
      const normalizedCurrentName = this.normalizeNodeName(node.name);

      if (normalizedNewName !== normalizedCurrentName) {
        const collision = workflow.nodes.find(n =>
          n.id !== node.id && this.normalizeNodeName(n.name) === normalizedNewName
        );
        if (collision) {
          return `Cannot rename node "${node.name}" to "${operation.updates.name}": A node with that name already exists (id: ${collision.id.substring(0, 8)}...). Please choose a different name.`;
        }
      }
    }

    return null;
  }

  private validateMoveNode(workflow: Workflow, operation: MoveNodeOperation): string | null {
    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) {
      return this.formatNodeNotFoundError(workflow, operation.nodeId || operation.nodeName || '', 'moveNode');
    }
    return null;
  }

  private validateToggleNode(workflow: Workflow, operation: EnableNodeOperation | DisableNodeOperation): string | null {
    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) {
      const operationType = operation.type === 'enableNode' ? 'enableNode' : 'disableNode';
      return this.formatNodeNotFoundError(workflow, operation.nodeId || operation.nodeName || '', operationType);
    }
    return null;
  }

  // ===== Connection operation validators =====

  private validateAddConnection(workflow: Workflow, operation: AddConnectionOperation): string | null {
    // Check for common parameter mistakes
    const operationAny = operation as any;
    if (operationAny.sourceNodeId || operationAny.targetNodeId) {
      const wrongParams: string[] = [];
      if (operationAny.sourceNodeId) wrongParams.push('sourceNodeId');
      if (operationAny.targetNodeId) wrongParams.push('targetNodeId');
      return `Invalid parameter(s): ${wrongParams.join(', ')}. Use 'source' and 'target' instead. Example: {type: "addConnection", source: "Node Name", target: "Target Name"}`;
    }

    if (!operation.source) {
      return `Missing required parameter 'source'. The addConnection operation requires both 'source' and 'target' parameters.`;
    }
    if (!operation.target) {
      return `Missing required parameter 'target'. The addConnection operation requires both 'source' and 'target' parameters.`;
    }

    const sourceNode = this.findNode(workflow, operation.source, operation.source);
    const targetNode = this.findNode(workflow, operation.target, operation.target);

    if (!sourceNode) {
      const availableNodes = workflow.nodes.map(n => `"${n.name}" (id: ${n.id.substring(0, 8)}...)`).join(', ');
      return `Source node not found: "${operation.source}". Available nodes: ${availableNodes}. Tip: Use node ID for names with special characters.`;
    }
    if (!targetNode) {
      const availableNodes = workflow.nodes.map(n => `"${n.name}" (id: ${n.id.substring(0, 8)}...)`).join(', ');
      return `Target node not found: "${operation.target}". Available nodes: ${availableNodes}. Tip: Use node ID for names with special characters.`;
    }

    // Check if connection already exists
    const sourceOutput = operation.sourceOutput || 'main';
    const existing = workflow.connections[sourceNode.name]?.[sourceOutput];
    if (existing) {
      const hasConnection = existing.some(connections =>
        connections.some(c => c.node === targetNode.name)
      );
      if (hasConnection) {
        return `Connection already exists from "${sourceNode.name}" to "${targetNode.name}"`;
      }
    }

    return null;
  }

  private validateRemoveConnection(workflow: Workflow, operation: RemoveConnectionOperation): string | null {
    if (operation.ignoreErrors) {
      return null;
    }

    const sourceNode = this.findNode(workflow, operation.source, operation.source);
    const targetNode = this.findNode(workflow, operation.target, operation.target);

    if (!sourceNode) {
      const availableNodes = workflow.nodes.map(n => `"${n.name}" (id: ${n.id.substring(0, 8)}...)`).join(', ');
      return `Source node not found: "${operation.source}". Available nodes: ${availableNodes}.`;
    }
    if (!targetNode) {
      const availableNodes = workflow.nodes.map(n => `"${n.name}" (id: ${n.id.substring(0, 8)}...)`).join(', ');
      return `Target node not found: "${operation.target}". Available nodes: ${availableNodes}.`;
    }

    const sourceOutput = operation.sourceOutput || 'main';
    const connections = workflow.connections[sourceNode.name]?.[sourceOutput];
    if (!connections) {
      return `No connections found from "${sourceNode.name}"`;
    }

    const hasConnection = connections.some(conns =>
      conns.some(c => c.node === targetNode.name)
    );

    if (!hasConnection) {
      return `No connection exists from "${sourceNode.name}" to "${targetNode.name}"`;
    }

    return null;
  }

  private validateRewireConnection(workflow: Workflow, operation: RewireConnectionOperation): string | null {
    const sourceNode = this.findNode(workflow, operation.source, operation.source);
    if (!sourceNode) {
      const availableNodes = workflow.nodes.map(n => `"${n.name}" (id: ${n.id.substring(0, 8)}...)`).join(', ');
      return `Source node not found: "${operation.source}". Available nodes: ${availableNodes}.`;
    }

    const fromNode = this.findNode(workflow, operation.from, operation.from);
    if (!fromNode) {
      const availableNodes = workflow.nodes.map(n => `"${n.name}" (id: ${n.id.substring(0, 8)}...)`).join(', ');
      return `"From" node not found: "${operation.from}". Available nodes: ${availableNodes}.`;
    }

    const toNode = this.findNode(workflow, operation.to, operation.to);
    if (!toNode) {
      const availableNodes = workflow.nodes.map(n => `"${n.name}" (id: ${n.id.substring(0, 8)}...)`).join(', ');
      return `"To" node not found: "${operation.to}". Available nodes: ${availableNodes}.`;
    }

    const { sourceOutput, sourceIndex } = this.resolveSmartParameters(workflow, operation);
    const connections = workflow.connections[sourceNode.name]?.[sourceOutput];
    if (!connections || !connections[sourceIndex]) {
      return `No connections found from "${sourceNode.name}" on output "${sourceOutput}" at index ${sourceIndex}`;
    }

    const hasConnection = connections[sourceIndex].some(c => c.node === fromNode.name);
    if (!hasConnection) {
      return `No connection exists from "${sourceNode.name}" to "${fromNode.name}" on output "${sourceOutput}" at index ${sourceIndex}`;
    }

    return null;
  }

  private validateActivateWorkflow(workflow: Workflow): string | null {
    const activatableTriggers = workflow.nodes.filter(
      node => !node.disabled && isActivatableTrigger(node.type)
    );

    if (activatableTriggers.length === 0) {
      return 'Cannot activate workflow: No activatable trigger nodes found. Workflows must have at least one enabled trigger node (webhook, schedule, email, etc.). Note: executeWorkflowTrigger cannot activate workflows.';
    }

    return null;
  }

  private validateReplaceConnections(workflow: Workflow, operation: ReplaceConnectionsOperation): string | null {
    const nodeNames = new Set(workflow.nodes.map(n => n.name));

    for (const [sourceName, outputs] of Object.entries(operation.connections)) {
      if (!nodeNames.has(sourceName)) {
        return `Source node not found in connections: ${sourceName}`;
      }

      for (const outputName of Object.keys(outputs)) {
        const connections = outputs[outputName];
        for (const conns of connections) {
          for (const conn of conns) {
            if (!nodeNames.has(conn.node)) {
              return `Target node not found in connections: ${conn.node}`;
            }
          }
        }
      }
    }

    return null;
  }

  // ===== Node operation appliers =====

  private applyAddNode(workflow: Workflow, operation: AddNodeOperation): void {
    const newNode: WorkflowNode = {
      id: operation.node.id || randomUUID(),
      name: operation.node.name,
      type: operation.node.type,
      typeVersion: operation.node.typeVersion || 1,
      position: operation.node.position,
      parameters: operation.node.parameters || {},
      credentials: operation.node.credentials,
      disabled: operation.node.disabled,
      notes: operation.node.notes,
      notesInFlow: operation.node.notesInFlow,
      continueOnFail: operation.node.continueOnFail,
      onError: operation.node.onError,
      retryOnFail: operation.node.retryOnFail,
      maxTries: operation.node.maxTries,
      waitBetweenTries: operation.node.waitBetweenTries,
      alwaysOutputData: operation.node.alwaysOutputData,
      executeOnce: operation.node.executeOnce
    };

    // Sanitize node to ensure complete metadata
    const sanitizedNode = sanitizeNode(newNode);
    workflow.nodes.push(sanitizedNode);
  }

  private applyRemoveNode(workflow: Workflow, operation: RemoveNodeOperation): void {
    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) return;
    
    // Remove node from array
    const index = workflow.nodes.findIndex(n => n.id === node.id);
    if (index !== -1) {
      workflow.nodes.splice(index, 1);
    }
    
    // Remove all connections from this node
    delete workflow.connections[node.name];
    
    // Remove all connections to this node
    Object.keys(workflow.connections).forEach(sourceName => {
      const sourceConnections = workflow.connections[sourceName];
      Object.keys(sourceConnections).forEach(outputName => {
        sourceConnections[outputName] = sourceConnections[outputName].map(connections =>
          connections.filter(conn => conn.node !== node.name)
        ).filter(connections => connections.length > 0);
        
        if (sourceConnections[outputName].length === 0) {
          delete sourceConnections[outputName];
        }
      });
      
      if (Object.keys(sourceConnections).length === 0) {
        delete workflow.connections[sourceName];
      }
    });
  }

  private applyUpdateNode(workflow: Workflow, operation: UpdateNodeOperation): void {
    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) return;

    // Track node renames for connection reference updates
    if (operation.updates.name && operation.updates.name !== node.name) {
      const oldName = node.name;
      const newName = operation.updates.name;
      this.renameMap.set(oldName, newName);
      debug('diff', `Tracking rename: "${oldName}" → "${newName}"`);
    }

    // Apply updates using dot notation
    Object.entries(operation.updates).forEach(([path, value]) => {
      this.setNestedProperty(node, path, value);
    });

    // Sanitize node after updates
    const sanitized = sanitizeNode(node);
    Object.assign(node, sanitized);
  }

  private applyMoveNode(workflow: Workflow, operation: MoveNodeOperation): void {
    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) return;
    node.position = operation.position;
  }

  private applyEnableNode(workflow: Workflow, operation: EnableNodeOperation): void {
    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) return;
    node.disabled = false;
  }

  private applyDisableNode(workflow: Workflow, operation: DisableNodeOperation): void {
    const node = this.findNode(workflow, operation.nodeId, operation.nodeName);
    if (!node) return;
    node.disabled = true;
  }

  // ===== Connection operation appliers =====

  /**
   * Resolve smart parameters (branch, case) to technical parameters
   */
  private resolveSmartParameters(
    workflow: Workflow,
    operation: AddConnectionOperation | RewireConnectionOperation
  ): { sourceOutput: string; sourceIndex: number } {
    const sourceNode = this.findNode(workflow, operation.source, operation.source);

    let sourceOutput = operation.sourceOutput ?? 'main';
    let sourceIndex = operation.sourceIndex ?? 0;

    // Smart parameter: branch (for IF nodes)
    if (operation.branch !== undefined && operation.sourceIndex === undefined) {
      if (sourceNode?.type === 'n8n-nodes-base.if') {
        sourceIndex = operation.branch === 'true' ? 0 : 1;
      }
    }

    // Smart parameter: case (for Switch nodes)
    if (operation.case !== undefined && operation.sourceIndex === undefined) {
      sourceIndex = operation.case;
    }

    // Warn if using sourceIndex with If/Switch nodes
    if (sourceNode && operation.sourceIndex !== undefined && operation.branch === undefined && operation.case === undefined) {
      if (sourceNode.type === 'n8n-nodes-base.if') {
        this.warnings.push({
          operation: -1,
          message: `Connection to If node "${operation.source}" uses sourceIndex=${operation.sourceIndex}. Consider using branch="true" or branch="false" for better clarity.`
        });
      } else if (sourceNode.type === 'n8n-nodes-base.switch') {
        this.warnings.push({
          operation: -1,
          message: `Connection to Switch node "${operation.source}" uses sourceIndex=${operation.sourceIndex}. Consider using case=N for better clarity.`
        });
      }
    }

    return { sourceOutput, sourceIndex };
  }

  private applyAddConnection(workflow: Workflow, operation: AddConnectionOperation): void {
    const sourceNode = this.findNode(workflow, operation.source, operation.source);
    const targetNode = this.findNode(workflow, operation.target, operation.target);
    if (!sourceNode || !targetNode) return;

    const { sourceOutput, sourceIndex } = this.resolveSmartParameters(workflow, operation);
    const targetInput = operation.targetInput ?? 'main';
    const targetIndex = operation.targetIndex ?? 0;

    // Initialize connection structure
    if (!workflow.connections[sourceNode.name]) {
      workflow.connections[sourceNode.name] = {};
    }
    if (!workflow.connections[sourceNode.name][sourceOutput]) {
      workflow.connections[sourceNode.name][sourceOutput] = [];
    }

    const outputArray = workflow.connections[sourceNode.name][sourceOutput];

    // Ensure arrays up to sourceIndex
    while (outputArray.length <= sourceIndex) {
      outputArray.push([]);
    }

    if (!Array.isArray(outputArray[sourceIndex])) {
      outputArray[sourceIndex] = [];
    }

    outputArray[sourceIndex].push({
      node: targetNode.name,
      type: targetInput,
      index: targetIndex
    });
  }

  private applyRemoveConnection(workflow: Workflow, operation: RemoveConnectionOperation): void {
    const sourceNode = this.findNode(workflow, operation.source, operation.source);
    const targetNode = this.findNode(workflow, operation.target, operation.target);
    if (!sourceNode || !targetNode) {
      if (operation.ignoreErrors) return;
      return;
    }
    
    const sourceOutput = operation.sourceOutput || 'main';
    const connections = workflow.connections[sourceNode.name]?.[sourceOutput];
    if (!connections) return;
    
    workflow.connections[sourceNode.name][sourceOutput] = connections.map(conns =>
      conns.filter(conn => conn.node !== targetNode.name)
    );

    // Remove trailing empty arrays
    const outputConnections = workflow.connections[sourceNode.name][sourceOutput];
    while (outputConnections.length > 0 && outputConnections[outputConnections.length - 1].length === 0) {
      outputConnections.pop();
    }

    if (outputConnections.length === 0) {
      delete workflow.connections[sourceNode.name][sourceOutput];
    }
    
    if (Object.keys(workflow.connections[sourceNode.name]).length === 0) {
      delete workflow.connections[sourceNode.name];
    }
  }

  private applyRewireConnection(workflow: Workflow, operation: RewireConnectionOperation): void {
    const { sourceOutput, sourceIndex } = this.resolveSmartParameters(workflow, operation);

    // Remove old connection
    this.applyRemoveConnection(workflow, {
      type: 'removeConnection',
      source: operation.source,
      target: operation.from,
      sourceOutput: sourceOutput,
      targetInput: operation.targetInput
    });

    // Add new connection
    this.applyAddConnection(workflow, {
      type: 'addConnection',
      source: operation.source,
      target: operation.to,
      sourceOutput: sourceOutput,
      targetInput: operation.targetInput,
      sourceIndex: sourceIndex,
      targetIndex: 0
    });
  }

  // ===== Metadata operation appliers =====

  private applyUpdateSettings(workflow: Workflow, operation: UpdateSettingsOperation): void {
    if (operation.settings && Object.keys(operation.settings).length > 0) {
      if (!workflow.settings) {
        workflow.settings = {};
      }
      Object.assign(workflow.settings, operation.settings);
    }
  }

  private applyUpdateName(workflow: Workflow, operation: UpdateNameOperation): void {
    workflow.name = operation.name;
  }

  private applyAddTag(workflow: Workflow, operation: AddTagOperation): void {
    if (!workflow.tags) {
      workflow.tags = [];
    }
    if (!workflow.tags.includes(operation.tag)) {
      workflow.tags.push(operation.tag);
    }
  }

  private applyRemoveTag(workflow: Workflow, operation: RemoveTagOperation): void {
    if (!workflow.tags) return;
    const index = workflow.tags.indexOf(operation.tag);
    if (index !== -1) {
      workflow.tags.splice(index, 1);
    }
  }

  private applyActivateWorkflow(workflow: Workflow): void {
    (workflow as any)._shouldActivate = true;
  }

  private applyDeactivateWorkflow(workflow: Workflow): void {
    (workflow as any)._shouldDeactivate = true;
  }

  private applyCleanStaleConnections(workflow: Workflow, operation: CleanStaleConnectionsOperation): void {
    const nodeNames = new Set(workflow.nodes.map(n => n.name));
    const staleConnections: Array<{ from: string; to: string }> = [];

    if (operation.dryRun) {
      // Just identify stale connections
      for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
        if (!nodeNames.has(sourceName)) {
          for (const [, connections] of Object.entries(outputs)) {
            for (const conns of connections) {
              for (const conn of conns) {
                staleConnections.push({ from: sourceName, to: conn.node });
              }
            }
          }
        } else {
          for (const [, connections] of Object.entries(outputs)) {
            for (const conns of connections) {
              for (const conn of conns) {
                if (!nodeNames.has(conn.node)) {
                  staleConnections.push({ from: sourceName, to: conn.node });
                }
              }
            }
          }
        }
      }
      debug('diff', `[DryRun] Would remove ${staleConnections.length} stale connections`);
      return;
    }

    // Actually remove stale connections
    for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
      if (!nodeNames.has(sourceName)) {
        for (const [, connections] of Object.entries(outputs)) {
          for (const conns of connections) {
            for (const conn of conns) {
              staleConnections.push({ from: sourceName, to: conn.node });
            }
          }
        }
        delete workflow.connections[sourceName];
        continue;
      }

      for (const [outputName, connections] of Object.entries(outputs)) {
        const filteredConnections = connections.map(conns =>
          conns.filter(conn => {
            if (!nodeNames.has(conn.node)) {
              staleConnections.push({ from: sourceName, to: conn.node });
              return false;
            }
            return true;
          })
        ).filter(conns => conns.length > 0);

        if (filteredConnections.length === 0) {
          delete outputs[outputName];
        } else {
          outputs[outputName] = filteredConnections;
        }
      }

      if (Object.keys(outputs).length === 0) {
        delete workflow.connections[sourceName];
      }
    }

    debug('diff', `Removed ${staleConnections.length} stale connections`);
  }

  private applyReplaceConnections(workflow: Workflow, operation: ReplaceConnectionsOperation): void {
    workflow.connections = operation.connections;
  }

  // ===== Helper methods =====

  /**
   * Update all connection references when nodes are renamed.
   */
  private updateConnectionReferences(workflow: Workflow): void {
    if (this.renameMap.size === 0) return;

    debug('diff', `Updating connection references for ${this.renameMap.size} renamed nodes`);
    const renames = new Map(this.renameMap);

    // Step 1: Update connection object keys (source node names)
    const updatedConnections: typeof workflow.connections = {};
    for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
      const newSourceName = renames.get(sourceName) || sourceName;
      updatedConnections[newSourceName] = outputs;
    }

    // Step 2: Update target node references within connections
    for (const [, outputs] of Object.entries(updatedConnections)) {
      for (const [, connections] of Object.entries(outputs)) {
        for (let outputIndex = 0; outputIndex < connections.length; outputIndex++) {
          const connectionsAtIndex = connections[outputIndex];
          for (let connIndex = 0; connIndex < connectionsAtIndex.length; connIndex++) {
            const connection = connectionsAtIndex[connIndex];
            if (renames.has(connection.node)) {
              connection.node = renames.get(connection.node)!;
            }
          }
        }
      }
    }

    workflow.connections = updatedConnections;
    debug('diff', `Auto-updated ${this.renameMap.size} node name references in connections`);
  }

  /**
   * Normalize node names to handle special characters
   */
  private normalizeNodeName(name: string): string {
    return name
      .trim()
      .replace(/\\\\/g, '\\')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\s+/g, ' ');
  }

  /**
   * Find a node by ID or name in the workflow.
   */
  private findNode(workflow: Workflow, nodeId?: string, nodeName?: string): WorkflowNode | null {
    if (nodeId) {
      const nodeById = workflow.nodes.find(n => n.id === nodeId);
      if (nodeById) return nodeById;
    }

    if (nodeName) {
      const normalizedSearch = this.normalizeNodeName(nodeName);
      const nodeByName = workflow.nodes.find(n =>
        this.normalizeNodeName(n.name) === normalizedSearch
      );
      if (nodeByName) return nodeByName;
    }

    // Fallback: If nodeId provided but not found, try treating it as a name
    if (nodeId && !nodeName) {
      const normalizedSearch = this.normalizeNodeName(nodeId);
      const nodeByName = workflow.nodes.find(n =>
        this.normalizeNodeName(n.name) === normalizedSearch
      );
      if (nodeByName) return nodeByName;
    }

    return null;
  }

  /**
   * Format a consistent "node not found" error message
   */
  private formatNodeNotFoundError(
    workflow: Workflow,
    nodeIdentifier: string,
    operationType: string
  ): string {
    const availableNodes = workflow.nodes
      .map(n => `"${n.name}" (id: ${n.id.substring(0, 8)}...)`)
      .join(', ');
    return `Node not found for ${operationType}: "${nodeIdentifier}". Available nodes: ${availableNodes}. Tip: Use node ID for names with special characters.`;
  }

  /**
   * Set a nested property using dot notation
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
}
