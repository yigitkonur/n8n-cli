/**
 * Workflow AutoFix Engine
 * 
 * Main orchestrator for generating and applying workflow fixes.
 * Combines expression validation, node similarity, version checking,
 * and breaking change detection to provide comprehensive autofix capabilities.
 * 
 * Ported from n8n-mcp/src/services/workflow-auto-fixer.ts with CLI adaptations.
 */

import crypto from 'crypto';
import type { Workflow, WorkflowNode, ValidationResult, ValidationIssue } from '../types.js';
import type {
  FixOperation,
  FixType,
  FixConfidenceLevel,
  AutoFixConfig,
  AutoFixResult,
  FixStats,
  ExpressionFormatIssue,
  NodeSuggestion,
} from './types.js';
import { 
  DEFAULT_AUTOFIX_CONFIG, 
  createEmptyStats, 
  CONFIDENCE_ORDER,
  getConfidenceIndex,
} from './types.js';
import { ExpressionValidator } from './expression-validator.js';
import { NodeSimilarityService } from './node-similarity.js';
import { 
  getBreakingChangesForNode, 
  hasBreakingChanges,
  getMigrationHints,
} from './breaking-changes-registry.js';
import type { NodeRepository } from '../db/nodes.js';

/**
 * Workflow AutoFix Engine
 * 
 * Generates fix operations for common workflow validation errors.
 */
export class WorkflowAutoFixer {
  private similarityService: NodeSimilarityService | null = null;
  private repository: NodeRepository | null = null;

  constructor(repository?: NodeRepository) {
    if (repository) {
      this.repository = repository;
      this.similarityService = new NodeSimilarityService(repository);
    }
  }

  /**
   * Generate fix operations from a workflow and validation results
   */
  async generateFixes(
    workflow: Workflow,
    validationResult?: ValidationResult,
    config: Partial<AutoFixConfig> = {}
  ): Promise<AutoFixResult> {
    const fullConfig = { ...DEFAULT_AUTOFIX_CONFIG, ...config };
    const fixes: FixOperation[] = [];

    // Create a map for quick node lookup
    const nodeMap = new Map<string, WorkflowNode>();
    if (workflow.nodes) {
      for (const node of workflow.nodes) {
        if (node.name) nodeMap.set(node.name, node);
        if (node.id) nodeMap.set(node.id, node);
      }
    }

    // Process expression format issues (HIGH confidence)
    if (!fullConfig.fixTypes || fullConfig.fixTypes.includes('expression-format')) {
      this.processExpressionFormatFixes(workflow, fixes);
    }

    // Process Switch/If options fixes - existing CLI fixes (HIGH confidence)
    if (!fullConfig.fixTypes || fullConfig.fixTypes.includes('switch-options')) {
      this.processSwitchOptionsFixes(workflow, fixes);
    }

    // Process webhook path fixes (HIGH confidence)
    if (!fullConfig.fixTypes || fullConfig.fixTypes.includes('webhook-missing-path')) {
      this.processWebhookPathFixes(workflow, validationResult, nodeMap, fixes);
    }

    // Process node type corrections (HIGH confidence for >90%)
    if (!fullConfig.fixTypes || fullConfig.fixTypes.includes('node-type-correction')) {
      await this.processNodeTypeFixes(workflow, validationResult, fixes);
    }

    // Process typeVersion corrections (MEDIUM confidence)
    if (!fullConfig.fixTypes || fullConfig.fixTypes.includes('typeversion-correction')) {
      this.processTypeVersionFixes(validationResult, nodeMap, fixes);
    }

    // Process error output config fixes (MEDIUM confidence)
    if (!fullConfig.fixTypes || fullConfig.fixTypes.includes('error-output-config')) {
      this.processErrorOutputFixes(validationResult, nodeMap, workflow, fixes);
    }

    // Process version upgrade suggestions (MEDIUM confidence)
    if (!fullConfig.fixTypes || fullConfig.fixTypes.includes('typeversion-upgrade')) {
      this.processVersionUpgradeFixes(workflow, fixes);
    }

    // Process version migration info (LOW confidence)
    if (!fullConfig.fixTypes || fullConfig.fixTypes.includes('version-migration')) {
      this.processVersionMigrationFixes(workflow, fixes);
    }

    // Filter by confidence threshold
    const filteredFixes = this.filterByConfidence(fixes, fullConfig.confidenceThreshold);

    // Apply max fixes limit
    const limitedFixes = filteredFixes.slice(0, fullConfig.maxFixes);

    // Calculate statistics
    const stats = this.calculateStats(limitedFixes);

    // Generate summary
    const summary = this.generateSummary(stats);

    // Apply fixes to workflow if requested
    let modifiedWorkflow: Workflow | undefined;
    if (fullConfig.applyFixes && limitedFixes.length > 0) {
      modifiedWorkflow = this.applyFixes(workflow, limitedFixes);
    }

    return {
      fixes: limitedFixes,
      stats,
      summary,
      workflow: modifiedWorkflow,
    };
  }

  /**
   * Process expression format fixes (missing = prefix)
   */
  private processExpressionFormatFixes(workflow: Workflow, fixes: FixOperation[]): void {
    if (!workflow.nodes) return;

    for (const node of workflow.nodes) {
      if (!node.parameters) continue;

      const context = {
        nodeType: node.type,
        nodeName: node.name || 'unnamed',
        nodeId: node.id,
      };

      const issues = ExpressionValidator.validateNodeParameters(node.parameters, context);

      for (const issue of issues) {
        if (issue.issueType === 'missing-prefix' && issue.severity === 'error') {
          fixes.push({
            node: node.name || node.id || 'unknown',
            field: `parameters.${issue.fieldPath}`,
            type: 'expression-format',
            before: issue.currentValue,
            after: issue.correctedValue,
            confidence: 'high',
            description: `Add missing = prefix: "${issue.currentValue}" → "${issue.correctedValue}"`,
            nodeId: node.id,
          });
        }
      }
    }
  }

  /**
   * Process Switch/If node options fixes (existing CLI fixes)
   */
  private processSwitchOptionsFixes(workflow: Workflow, fixes: FixOperation[]): void {
    if (!workflow.nodes) return;

    for (const node of workflow.nodes) {
      // Fix empty options on If/Switch nodes
      if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch') {
        const parameters = node.parameters as Record<string, unknown> | undefined;
        
        if (
          parameters &&
          'options' in parameters &&
          typeof parameters.options === 'object' &&
          parameters.options !== null &&
          Object.keys(parameters.options as object).length === 0
        ) {
          fixes.push({
            node: node.name || 'unnamed',
            field: 'parameters.options',
            type: 'switch-options',
            before: {},
            after: undefined, // Will be deleted
            confidence: 'high',
            description: 'Remove invalid empty options field',
            nodeId: node.id,
          });
        }
      }

      // Fix Switch v3+ missing conditions options
      if (node.type === 'n8n-nodes-base.switch' && 
          typeof node.typeVersion === 'number' && 
          node.typeVersion >= 3) {
        const parameters = node.parameters as Record<string, unknown> | undefined;
        const rules = parameters?.rules as Record<string, unknown> | undefined;
        const values = rules?.values as Array<Record<string, unknown>> | undefined;

        if (Array.isArray(values)) {
          for (let i = 0; i < values.length; i++) {
            const rule = values[i];
            const conditions = rule?.conditions as Record<string, unknown> | undefined;
            
            if (conditions && (!conditions.options || typeof conditions.options !== 'object')) {
              const defaultOptions = {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                ...(node.typeVersion >= 3.2 ? { version: 2 } : {}),
              };

              fixes.push({
                node: node.name || 'unnamed',
                field: `parameters.rules.values[${i}].conditions.options`,
                type: 'switch-options',
                before: conditions.options,
                after: defaultOptions,
                confidence: 'high',
                description: `Add missing options to Switch v${node.typeVersion} rule conditions`,
                nodeId: node.id,
              });
            }
          }
        }

        // Fix fallbackOutput location
        if (rules && 'fallbackOutput' in rules) {
          fixes.push({
            node: node.name || 'unnamed',
            field: 'parameters.options.fallbackOutput',
            type: 'switch-options',
            before: { location: 'rules' },
            after: { location: 'options', value: rules.fallbackOutput },
            confidence: 'high',
            description: 'Move fallbackOutput from rules to options',
            nodeId: node.id,
          });
        }
      }
    }
  }

  /**
   * Process webhook path fixes
   */
  private processWebhookPathFixes(
    workflow: Workflow,
    validationResult: ValidationResult | undefined,
    nodeMap: Map<string, WorkflowNode>,
    fixes: FixOperation[]
  ): void {
    // Check validation errors for webhook path issues
    if (validationResult?.issues) {
      for (const issue of validationResult.issues) {
        if (issue.message.toLowerCase().includes('webhook path') ||
            (issue.code === 'MISSING_PROPERTY' && issue.location?.path?.includes('path'))) {
          const nodeName = issue.location?.nodeName || issue.location?.nodeId;
          if (!nodeName) continue;

          const node = nodeMap.get(nodeName);
          if (!node || !node.type?.includes('webhook')) continue;

          const webhookId = crypto.randomUUID();
          const currentVersion = node.typeVersion || 1;
          const needsVersionUpdate = currentVersion < 2;

          fixes.push({
            node: nodeName,
            field: 'parameters.path',
            type: 'webhook-missing-path',
            before: undefined,
            after: webhookId,
            confidence: 'high',
            description: needsVersionUpdate
              ? `Generate webhook path: ${webhookId} (upgrading to v2)`
              : `Generate webhook path: ${webhookId}`,
            nodeId: node.id,
          });
        }
      }
    }

    // Also check for webhooks without paths directly
    if (workflow.nodes) {
      for (const node of workflow.nodes) {
        if (!node.type?.includes('webhook')) continue;
        
        const params = node.parameters as Record<string, unknown> | undefined;
        if (!params?.path && !fixes.some(f => f.node === node.name && f.type === 'webhook-missing-path')) {
          const webhookId = crypto.randomUUID();
          
          fixes.push({
            node: node.name || 'unnamed',
            field: 'parameters.path',
            type: 'webhook-missing-path',
            before: undefined,
            after: webhookId,
            confidence: 'high',
            description: `Generate webhook path: ${webhookId}`,
            nodeId: node.id,
          });
        }
      }
    }
  }

  /**
   * Process node type corrections for typos
   */
  private async processNodeTypeFixes(
    workflow: Workflow,
    validationResult: ValidationResult | undefined,
    fixes: FixOperation[]
  ): Promise<void> {
    if (!this.similarityService || !workflow.nodes) return;

    // Check validation errors for unknown node types
    if (validationResult?.issues) {
      for (const issue of validationResult.issues) {
        if (issue.code === 'UNKNOWN_NODE_TYPE' || 
            issue.message.toLowerCase().includes('unknown node type')) {
          const nodeName = issue.location?.nodeName;
          const nodeType = issue.location?.nodeType || issue.context?.value as string;
          
          if (!nodeName || !nodeType) continue;

          const suggestions = await this.similarityService.findSimilarNodes(nodeType, 3);
          const autoFixable = suggestions.find(s => this.similarityService!.isAutoFixable(s));

          if (autoFixable) {
            fixes.push({
              node: nodeName,
              field: 'type',
              type: 'node-type-correction',
              before: nodeType,
              after: autoFixable.nodeType,
              confidence: 'high',
              description: `Fix typo: "${nodeType}" → "${autoFixable.nodeType}" (${Math.round(autoFixable.confidence * 100)}% match)`,
              nodeId: issue.location?.nodeId,
            });
          }
        }
      }
    }
  }

  /**
   * Process typeVersion corrections
   */
  private processTypeVersionFixes(
    validationResult: ValidationResult | undefined,
    nodeMap: Map<string, WorkflowNode>,
    fixes: FixOperation[]
  ): void {
    if (!validationResult?.issues) return;

    for (const issue of validationResult.issues) {
      if (issue.message.includes('typeVersion') && 
          issue.message.includes('exceeds maximum')) {
        const versionMatch = issue.message.match(/typeVersion (\d+(?:\.\d+)?) exceeds maximum.*?(\d+(?:\.\d+)?)/);
        if (versionMatch) {
          const currentVersion = parseFloat(versionMatch[1]);
          const maxVersion = parseFloat(versionMatch[2]);
          const nodeName = issue.location?.nodeName || issue.location?.nodeId;

          if (!nodeName) continue;

          fixes.push({
            node: nodeName,
            field: 'typeVersion',
            type: 'typeversion-correction',
            before: currentVersion,
            after: maxVersion,
            confidence: 'medium',
            description: `Correct typeVersion: ${currentVersion} → ${maxVersion} (maximum supported)`,
            nodeId: issue.location?.nodeId,
          });
        }
      }
    }
  }

  /**
   * Process error output configuration fixes
   */
  private processErrorOutputFixes(
    validationResult: ValidationResult | undefined,
    nodeMap: Map<string, WorkflowNode>,
    workflow: Workflow,
    fixes: FixOperation[]
  ): void {
    if (!validationResult?.issues) return;

    for (const issue of validationResult.issues) {
      if (issue.message.includes("onError: 'continueErrorOutput'") &&
          issue.message.includes('no error output')) {
        const nodeName = issue.location?.nodeName || issue.location?.nodeId;
        if (!nodeName) continue;

        fixes.push({
          node: nodeName,
          field: 'onError',
          type: 'error-output-config',
          before: 'continueErrorOutput',
          after: undefined,
          confidence: 'medium',
          description: 'Remove onError setting (no error output connections)',
          nodeId: issue.location?.nodeId,
        });
      }
    }
  }

  /**
   * Process version upgrade suggestions
   */
  private processVersionUpgradeFixes(workflow: Workflow, fixes: FixOperation[]): void {
    if (!this.repository || !workflow.nodes) return;

    for (const node of workflow.nodes) {
      if (!node.type || !node.typeVersion) continue;

      // Get node info from repository to check latest version
      const nodeInfo = this.repository.getNode(node.type);
      if (!nodeInfo?.version) continue;

      const currentVersion = node.typeVersion.toString();
      const latestVersion = nodeInfo.version;

      // Compare versions
      if (this.compareVersions(currentVersion, latestVersion) < 0) {
        const hasBreaking = hasBreakingChanges(node.type, currentVersion, latestVersion);

        fixes.push({
          node: node.name || 'unnamed',
          field: 'typeVersion',
          type: 'typeversion-upgrade',
          before: currentVersion,
          after: latestVersion,
          confidence: hasBreaking ? 'medium' : 'high',
          description: hasBreaking
            ? `Upgrade available: v${currentVersion} → v${latestVersion} (has breaking changes)`
            : `Upgrade available: v${currentVersion} → v${latestVersion}`,
          nodeId: node.id,
        });
      }
    }
  }

  /**
   * Process version migration information (informational)
   */
  private processVersionMigrationFixes(workflow: Workflow, fixes: FixOperation[]): void {
    if (!workflow.nodes) return;

    for (const node of workflow.nodes) {
      if (!node.type || !node.typeVersion) continue;

      const currentVersion = node.typeVersion.toString();
      const hints = getMigrationHints(node.type, currentVersion, '99.0'); // Get all future hints

      if (hints.length > 0) {
        fixes.push({
          node: node.name || 'unnamed',
          field: 'typeVersion',
          type: 'version-migration',
          before: currentVersion,
          after: 'latest',
          confidence: 'low',
          description: `Migration info: ${hints.slice(0, 2).join('; ')}${hints.length > 2 ? '...' : ''}`,
          nodeId: node.id,
        });
      }
    }
  }

  /**
   * Filter fixes by confidence threshold
   */
  private filterByConfidence(
    fixes: FixOperation[],
    threshold?: FixConfidenceLevel
  ): FixOperation[] {
    if (!threshold) return fixes;

    const thresholdIndex = getConfidenceIndex(threshold);

    return fixes.filter(fix => {
      const fixIndex = getConfidenceIndex(fix.confidence);
      return fixIndex <= thresholdIndex;
    });
  }

  /**
   * Calculate statistics about fixes
   */
  private calculateStats(fixes: FixOperation[]): FixStats {
    const stats = createEmptyStats();
    stats.total = fixes.length;

    for (const fix of fixes) {
      stats.byType[fix.type]++;
      stats.byConfidence[fix.confidence]++;
    }

    return stats;
  }

  /**
   * Generate a human-readable summary
   */
  private generateSummary(stats: FixStats): string {
    if (stats.total === 0) {
      return 'No fixes available';
    }

    const parts: string[] = [];

    if (stats.byType['expression-format'] > 0) {
      parts.push(`${stats.byType['expression-format']} expression fix${stats.byType['expression-format'] === 1 ? '' : 'es'}`);
    }
    if (stats.byType['switch-options'] > 0) {
      parts.push(`${stats.byType['switch-options']} Switch/If fix${stats.byType['switch-options'] === 1 ? '' : 'es'}`);
    }
    if (stats.byType['webhook-missing-path'] > 0) {
      parts.push(`${stats.byType['webhook-missing-path']} webhook path${stats.byType['webhook-missing-path'] === 1 ? '' : 's'}`);
    }
    if (stats.byType['node-type-correction'] > 0) {
      parts.push(`${stats.byType['node-type-correction']} node type correction${stats.byType['node-type-correction'] === 1 ? '' : 's'}`);
    }
    if (stats.byType['typeversion-correction'] > 0) {
      parts.push(`${stats.byType['typeversion-correction']} version correction${stats.byType['typeversion-correction'] === 1 ? '' : 's'}`);
    }
    if (stats.byType['error-output-config'] > 0) {
      parts.push(`${stats.byType['error-output-config']} error config fix${stats.byType['error-output-config'] === 1 ? '' : 'es'}`);
    }
    if (stats.byType['typeversion-upgrade'] > 0) {
      parts.push(`${stats.byType['typeversion-upgrade']} upgrade suggestion${stats.byType['typeversion-upgrade'] === 1 ? '' : 's'}`);
    }
    if (stats.byType['version-migration'] > 0) {
      parts.push(`${stats.byType['version-migration']} migration hint${stats.byType['version-migration'] === 1 ? '' : 's'}`);
    }

    if (parts.length === 0) {
      return `${stats.total} fix${stats.total === 1 ? '' : 'es'} available`;
    }

    const confidenceSummary = `(${stats.byConfidence.high} high, ${stats.byConfidence.medium} medium, ${stats.byConfidence.low} low confidence)`;

    return `${stats.total} fix${stats.total === 1 ? '' : 'es'}: ${parts.join(', ')} ${confidenceSummary}`;
  }

  /**
   * Apply fixes to workflow (mutates a copy)
   */
  private applyFixes(workflow: Workflow, fixes: FixOperation[]): Workflow {
    // Deep clone the workflow
    const modified = JSON.parse(JSON.stringify(workflow)) as Workflow;

    // Group fixes by node
    const fixesByNode = new Map<string, FixOperation[]>();
    for (const fix of fixes) {
      const key = fix.node;
      if (!fixesByNode.has(key)) {
        fixesByNode.set(key, []);
      }
      fixesByNode.get(key)!.push(fix);
    }

    // Apply fixes to each node
    for (const node of modified.nodes || []) {
      const nodeFixes = fixesByNode.get(node.name || '') || fixesByNode.get(node.id || '');
      if (!nodeFixes) continue;

      for (const fix of nodeFixes) {
        this.applyFixToNode(node, fix);
      }
    }

    return modified;
  }

  /**
   * Apply a single fix to a node
   */
  private applyFixToNode(node: WorkflowNode, fix: FixOperation): void {
    const pathParts = fix.field.split('.');
    let current: any = node;

    // Navigate to parent of the target
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);

      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        if (!current[key]) current[key] = [];
        if (!current[key][parseInt(index)]) current[key][parseInt(index)] = {};
        current = current[key][parseInt(index)];
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }

    // Apply the fix
    const lastPart = pathParts[pathParts.length - 1];
    const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/);

    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      if (fix.after === undefined) {
        delete current[key][parseInt(index)];
      } else {
        if (!current[key]) current[key] = [];
        current[key][parseInt(index)] = fix.after;
      }
    } else {
      if (fix.after === undefined) {
        delete current[lastPart];
      } else {
        current[lastPart] = fix.after;
      }
    }

    // Special handling for specific fix types
    if (fix.type === 'webhook-missing-path') {
      // Also set webhookId
      node.webhookId = fix.after as string;
      // Update typeVersion if needed
      if ((node.typeVersion || 1) < 2) {
        node.typeVersion = 2;
      }
    }

    if (fix.type === 'switch-options' && fix.description.includes('fallbackOutput')) {
      // Handle fallbackOutput move
      const params = node.parameters as Record<string, unknown>;
      const rules = params?.rules as Record<string, unknown>;
      if (rules && 'fallbackOutput' in rules) {
        if (!params.options) params.options = {};
        (params.options as Record<string, unknown>).fallbackOutput = rules.fallbackOutput;
        delete rules.fallbackOutput;
      }
    }
  }

  /**
   * Simple version comparison
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }
}
