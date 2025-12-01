import type { Workflow } from './types.js';
import type { FixDetail, PostUpdateGuidance, FixType, FixConfidenceLevel } from './autofix/types.js';
import { ExpressionFormatValidator } from './validation/index.js';
import { NodeSimilarityService } from './autofix/node-similarity.js';
import { getNodeRepository, type NodeRepository } from './db/nodes.js';
import { NodeMigrationService, NodeVersionService } from './versioning/index.js';

export interface FixResult {
  fixed: number;
  warnings: string[];
  /** Detailed information about each fix applied */
  fixDetails?: FixDetail[];
  /** Post-update guidance for nodes that were fixed */
  postUpdateGuidance?: PostUpdateGuidance[];
}

export interface ExperimentalFix {
  id: string;
  description: string;
  apply(workflow: Workflow): FixResult;
}

export interface AsyncExperimentalFix {
  id: string;
  description: string;
  apply(workflow: Workflow): Promise<FixResult>;
}

function mergeFixResults(results: FixResult[]): FixResult {
  let fixed = 0;
  const warnings: string[] = [];
  const fixDetails: FixDetail[] = [];

  for (const result of results) {
    fixed += result.fixed;
    if (result.warnings.length) {
      warnings.push(...result.warnings);
    }
    if (result.fixDetails?.length) {
      fixDetails.push(...result.fixDetails);
    }
  }

  return { fixed, warnings, fixDetails: fixDetails.length > 0 ? fixDetails : undefined };
}

/**
 * Set a value at a nested path in an object
 * Supports paths like "body.values[0].value" or "url"
 */
function setNestedValue(obj: any, path: string, value: any): boolean {
  if (!path) return false;
  
  // Convert array notation [n] to .n for easier splitting
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const parts = normalizedPath.split('.');
  
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined || current[key] === null) {
      return false;
    }
    current = current[key];
  }
  
  const lastKey = parts[parts.length - 1];
  if (current === undefined || current === null) {
    return false;
  }
  
  current[lastKey] = value;
  return true;
}

const fixEmptyOptionsOnConditionalNodes: ExperimentalFix = {
  id: 'empty-options-if-switch',
  description: "Remove invalid empty 'options' field from the root parameters of If/Switch nodes.",
  apply(workflow: Workflow): FixResult {
    const warnings: string[] = [];
    const fixDetails: FixDetail[] = [];
    let fixed = 0;

    if (!Array.isArray(workflow.nodes)) {
      return { fixed, warnings };
    }

    for (const node of workflow.nodes) {
      if (!node || typeof node !== 'object') continue;

      if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch') {
        const parameters = (node as any).parameters;

        if (
          parameters &&
          typeof parameters === 'object' &&
          'options' in parameters &&
          typeof (parameters as any).options === 'object' &&
          (parameters as any).options !== null &&
          Object.keys((parameters as any).options as object).length === 0
        ) {
          delete (parameters as any).options;
          fixed++;
          const fixMsg = `Fixed node "${(node as any).name}": Removed invalid empty 'options' field from parameters root`;
          warnings.push(fixMsg);
          fixDetails.push({
            nodeId: (node as any).id || 'unknown',
            nodeName: (node as any).name || 'Unknown',
            nodeType: node.type,
            nodeVersion: typeof node.typeVersion === 'number' ? node.typeVersion : undefined,
            fixType: 'switch-options' as FixType,
            propertyPath: 'parameters.options',
            oldValue: {},
            newValue: undefined,
            description: fixMsg,
            confidence: 'high' as FixConfidenceLevel,
          });
        }
      }
    }

    return { fixed, warnings, fixDetails: fixDetails.length > 0 ? fixDetails : undefined };
  },
};

/**
 * Fix Switch v3+ rule conditions missing 'options' object.
 * Each rule's conditions must have options: { caseSensitive, leftValue, typeValidation, version }
 */
const fixSwitchV3RuleConditionsOptions: ExperimentalFix = {
  id: 'switch-v3-rule-conditions-options',
  description: "Add missing 'options' object to Switch v3+ rule conditions (required by n8n schema).",
  apply(workflow: Workflow): FixResult {
    const warnings: string[] = [];
    const fixDetails: FixDetail[] = [];
    let fixed = 0;

    if (!Array.isArray(workflow.nodes)) {
      return { fixed, warnings };
    }

    for (const node of workflow.nodes) {
      if (!node || typeof node !== 'object') continue;

      // Only apply to Switch v3+
      if (node.type !== 'n8n-nodes-base.switch') continue;
      if (typeof node.typeVersion !== 'number' || node.typeVersion < 3) continue;

      const parameters = node.parameters as Record<string, unknown> | undefined;
      if (!parameters) continue;

      const rules = parameters.rules as Record<string, unknown> | undefined;
      if (!rules || typeof rules !== 'object') continue;

      const values = (rules as Record<string, unknown>).values as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(values)) continue;

      for (const rule of values) {
        if (!rule || typeof rule !== 'object') continue;

        const conditions = rule.conditions as Record<string, unknown> | undefined;
        if (!conditions || typeof conditions !== 'object') continue;

        // Check if options is missing or incomplete
        let needsFix = false;
        const oldOpts = conditions.options ? { ...conditions.options as object } : undefined;
        let opts = conditions.options as Record<string, unknown> | undefined;

        if (!opts || typeof opts !== 'object') {
          opts = {};
          needsFix = true;
        }

        // Ensure required fields exist
        if (!('caseSensitive' in opts)) {
          opts.caseSensitive = true;
          needsFix = true;
        }
        if (!('leftValue' in opts)) {
          opts.leftValue = '';
          needsFix = true;
        }
        if (!('typeValidation' in opts)) {
          opts.typeValidation = 'strict';
          needsFix = true;
        }
        // Add version: 2 for Switch v3.2+
        if (node.typeVersion >= 3.2 && !('version' in opts)) {
          opts.version = 2;
          needsFix = true;
        }

        if (needsFix) {
          conditions.options = opts;
          fixed++;
          const fixMsg = `Fixed node "${node.name}": Added missing 'options' to rule conditions`;
          warnings.push(fixMsg);
          fixDetails.push({
            nodeId: (node as any).id || 'unknown',
            nodeName: node.name || 'Unknown',
            nodeType: node.type,
            nodeVersion: node.typeVersion,
            fixType: 'switch-options' as FixType,
            propertyPath: 'parameters.rules.values[].conditions.options',
            oldValue: oldOpts,
            newValue: opts,
            description: fixMsg,
            confidence: 'high' as FixConfidenceLevel,
          });
        }
      }
    }

    return { fixed, warnings, fixDetails: fixDetails.length > 0 ? fixDetails : undefined };
  },
};

/**
 * Fix Switch v3+ fallbackOutput in wrong location.
 * Should be at parameters.options.fallbackOutput, not parameters.rules.fallbackOutput
 */
const fixSwitchV3FallbackOutputLocation: ExperimentalFix = {
  id: 'switch-v3-fallback-output-location',
  description: "Move 'fallbackOutput' from rules to options for Switch v3+ nodes.",
  apply(workflow: Workflow): FixResult {
    const warnings: string[] = [];
    const fixDetails: FixDetail[] = [];
    let fixed = 0;

    if (!Array.isArray(workflow.nodes)) {
      return { fixed, warnings };
    }

    for (const node of workflow.nodes) {
      if (!node || typeof node !== 'object') continue;

      // Only apply to Switch v3+
      if (node.type !== 'n8n-nodes-base.switch') continue;
      if (typeof node.typeVersion !== 'number' || node.typeVersion < 3) continue;

      const parameters = node.parameters as Record<string, unknown> | undefined;
      if (!parameters) continue;

      const rules = parameters.rules as Record<string, unknown> | undefined;
      if (!rules || typeof rules !== 'object') continue;

      // Check if fallbackOutput is incorrectly in rules
      if ('fallbackOutput' in rules) {
        const fallbackValue = (rules as Record<string, unknown>).fallbackOutput;
        delete (rules as Record<string, unknown>).fallbackOutput;

        // Ensure options object exists
        if (!parameters.options || typeof parameters.options !== 'object') {
          parameters.options = {};
        }

        // Move to options
        (parameters.options as Record<string, unknown>).fallbackOutput = fallbackValue;
        fixed++;
        const fixMsg = `Fixed node "${node.name}": Moved 'fallbackOutput' from rules to options`;
        warnings.push(fixMsg);
        fixDetails.push({
          nodeId: (node as any).id || 'unknown',
          nodeName: node.name || 'Unknown',
          nodeType: node.type,
          nodeVersion: node.typeVersion,
          fixType: 'switch-options' as FixType,
          propertyPath: 'parameters.options.fallbackOutput',
          oldValue: { location: 'rules', value: fallbackValue },
          newValue: { location: 'options', value: fallbackValue },
          description: fixMsg,
          confidence: 'high' as FixConfidenceLevel,
        });
      }
    }

    return { fixed, warnings, fixDetails: fixDetails.length > 0 ? fixDetails : undefined };
  },
};

/**
 * Fix expression format issues:
 * - Add missing '=' prefix to expressions containing {{ }}
 * - Convert to resource locator format where appropriate
 */
const fixExpressionFormat: ExperimentalFix = {
  id: 'expression-format',
  description: "Add missing '=' prefix to expressions ({{ }} → ={{ }}).",
  apply(workflow: Workflow): FixResult {
    const warnings: string[] = [];
    const fixDetails: FixDetail[] = [];
    let fixed = 0;

    if (!Array.isArray(workflow.nodes)) {
      return { fixed, warnings };
    }

    /**
     * Recursively scan and fix expression format in an object
     */
    function scanAndFix(obj: unknown, path: string[] = [], currentNode: any = null): void {
      if (obj === null || obj === undefined) return;

      if (typeof obj === 'string') {
        // Pattern: {{ expression }} should be ={{ expression }}
        // Only fix if it starts with {{ but NOT with =
        if (obj.startsWith('{{') && !obj.startsWith('=')) {
          return; // We'll handle this at the parent level
        }
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
          if (typeof item === 'string' && item.startsWith('{{') && !item.startsWith('=')) {
            const corrected = `=${item}`;
            obj[idx] = corrected;
            fixed++;
            const fixMsg = `Fixed expression at ${path.join('.')}[${idx}]: Added missing = prefix`;
            warnings.push(fixMsg);
            if (currentNode) {
              fixDetails.push({
                nodeId: currentNode.id || 'unknown',
                nodeName: currentNode.name || 'Unknown',
                nodeType: currentNode.type || 'unknown',
                nodeVersion: typeof currentNode.typeVersion === 'number' ? currentNode.typeVersion : undefined,
                fixType: 'expression-format' as FixType,
                propertyPath: `${path.join('.')}[${idx}]`,
                oldValue: item,
                newValue: corrected,
                description: fixMsg,
                confidence: 'high' as FixConfidenceLevel,
              });
            }
          } else if (item && typeof item === 'object') {
            scanAndFix(item, [...path, String(idx)], currentNode);
          }
        });
        return;
      }

      if (typeof obj === 'object') {
        const record = obj as Record<string, unknown>;
        for (const [key, value] of Object.entries(record)) {
          const currentPath = [...path, key];
          
          if (typeof value === 'string') {
            // Pattern: {{ expression }} should be ={{ expression }}
            if (value.startsWith('{{') && !value.startsWith('=')) {
              const corrected = `=${value}`;
              record[key] = corrected;
              fixed++;
              const fixMsg = `Fixed expression at ${currentPath.join('.')}: Added missing = prefix`;
              warnings.push(fixMsg);
              if (currentNode) {
                fixDetails.push({
                  nodeId: currentNode.id || 'unknown',
                  nodeName: currentNode.name || 'Unknown',
                  nodeType: currentNode.type || 'unknown',
                  nodeVersion: typeof currentNode.typeVersion === 'number' ? currentNode.typeVersion : undefined,
                  fixType: 'expression-format' as FixType,
                  propertyPath: currentPath.join('.'),
                  oldValue: value,
                  newValue: corrected,
                  description: fixMsg,
                  confidence: 'high' as FixConfidenceLevel,
                });
              }
            }
          } else if (value && typeof value === 'object') {
            scanAndFix(value, currentPath, currentNode);
          }
        }
      }
    }

    // Process each node's parameters
    for (const node of workflow.nodes) {
      if (!node || typeof node !== 'object') continue;
      
      const parameters = node.parameters;
      if (parameters && typeof parameters === 'object') {
        scanAndFix(parameters, [node.name || 'unknown', 'parameters'], node);
      }
    }

    return { fixed, warnings, fixDetails: fixDetails.length > 0 ? fixDetails : undefined };
  },
};

/**
 * Fix outdated node typeVersions by upgrading to latest available version.
 * Applies auto-migratable changes from the breaking changes registry.
 */
const fixOutdatedTypeVersions: ExperimentalFix = {
  id: 'typeversion-upgrade',
  description: 'Upgrade outdated node typeVersions and apply auto-migrations.',
  apply(workflow: Workflow): FixResult {
    const warnings: string[] = [];
    let fixed = 0;

    if (!Array.isArray(workflow.nodes)) {
      return { fixed, warnings };
    }

    const migrationService = new NodeMigrationService();
    const versionService = new NodeVersionService();

    for (const node of workflow.nodes) {
      if (!node || typeof node !== 'object') continue;
      if (!node.type || typeof node.type !== 'string') continue;

      // Skip community nodes (non n8n-nodes-base)
      if (!node.type.startsWith('n8n-nodes-base.')) continue;

      const currentVersion = String(node.typeVersion || '1');
      
      // Check if this node is tracked in our registry
      if (!versionService.isNodeTracked(node.type)) continue;

      // Analyze if upgrade is needed
      const analysis = versionService.analyzeVersion(node.type, currentVersion);
      
      if (!analysis.isOutdated) continue;

      // Apply migration
      const result = migrationService.migrateNode(node as Record<string, unknown>);
      
      if (result.appliedMigrations.length > 0) {
        fixed++;
        const migrations = result.appliedMigrations
          .map(m => m.action)
          .join(', ');
        warnings.push(
          `Fixed node "${node.name}": Upgraded from v${result.fromVersion} to v${result.toVersion} (${migrations})`
        );
      }

      if (result.remainingIssues.length > 0) {
        warnings.push(
          `Node "${node.name}": Manual action needed after upgrade: ${result.remainingIssues.join('; ')}`
        );
      }
    }

    return { fixed, warnings };
  },
};

const defaultExperimentalFixes: ExperimentalFix[] = [
  fixEmptyOptionsOnConditionalNodes,
  fixSwitchV3RuleConditionsOptions,
  fixSwitchV3FallbackOutputLocation,
  fixExpressionFormat,
];

/**
 * All available experimental fixes including typeversion-upgrade
 * (typeversion-upgrade is opt-in via --upgrade-versions flag)
 */
const allExperimentalFixes: ExperimentalFix[] = [
  ...defaultExperimentalFixes,
  fixOutdatedTypeVersions,
];

/**
 * Async fix: Correct unknown node types using similarity service
 * Fixes node types with 90%+ confidence match
 */
async function fixNodeTypeCorrection(
  workflow: Workflow,
  similarityService?: NodeSimilarityService,
  nodeRepository?: NodeRepository,
): Promise<FixResult> {
  const warnings: string[] = [];
  let fixed = 0;

  if (!Array.isArray(workflow.nodes)) {
    return { fixed, warnings };
  }

  // Initialize services if not provided
  const repo = nodeRepository || await getNodeRepository();
  const service = similarityService || new NodeSimilarityService(repo);

  for (const node of workflow.nodes) {
    if (!node || typeof node !== 'object') continue;
    if (!node.type || typeof node.type !== 'string') continue;

    // Check if node type is known
    const nodeInfo = repo.getNode(node.type);
    if (nodeInfo) continue; // Valid node type, skip

    // Try to find similar nodes
    const suggestions = await service.findSimilarNodes(node.type, 1);
    if (suggestions.length === 0) continue;

    const topSuggestion = suggestions[0];
    
    // Only auto-fix with high confidence (90%+)
    if (service.isAutoFixable(topSuggestion)) {
      const originalType = node.type;
      node.type = topSuggestion.nodeType;
      fixed++;
      warnings.push(
        `Fixed node "${node.name}": "${originalType}" → "${topSuggestion.nodeType}" (${topSuggestion.reason}, ${Math.round(topSuggestion.confidence * 100)}% match)`
      );
    }
  }

  return { fixed, warnings };
}

export function applyExperimentalFixes(
  workflow: Workflow,
  fixes: ExperimentalFix[] = defaultExperimentalFixes,
): FixResult {
  const results: FixResult[] = [];

  for (const fix of fixes) {
    results.push(fix.apply(workflow));
  }

  return mergeFixResults(results);
}

/**
 * Apply all experimental fixes including async ones (like node type correction)
 * This is the recommended function for autofix command
 */
export async function applyExperimentalFixesAsync(
  workflow: Workflow,
  options?: {
    includeNodeTypeCorrection?: boolean;
    similarityService?: NodeSimilarityService;
    nodeRepository?: NodeRepository;
  },
): Promise<FixResult> {
  const results: FixResult[] = [];

  // Apply sync fixes first
  for (const fix of defaultExperimentalFixes) {
    results.push(fix.apply(workflow));
  }

  // Apply node type correction if requested
  if (options?.includeNodeTypeCorrection !== false) {
    results.push(await fixNodeTypeCorrection(
      workflow,
      options?.similarityService,
      options?.nodeRepository,
    ));
  }

  return mergeFixResults(results);
}

export function fixInvalidOptionsFields(workflow: Workflow): FixResult {
  return fixEmptyOptionsOnConditionalNodes.apply(workflow);
}

/**
 * Get an experimental fix by its ID
 */
export function getExperimentalFixById(id: string): ExperimentalFix | undefined {
  return allExperimentalFixes.find(fix => fix.id === id);
}

/**
 * Get experimental fixes by IDs (for --fix-types filtering)
 */
export function getExperimentalFixesByIds(ids: string[]): ExperimentalFix[] {
  return allExperimentalFixes.filter(fix => ids.includes(fix.id));
}

/**
 * Apply specific fixes by ID
 */
export function applyFixesByIds(workflow: Workflow, fixIds: string[]): FixResult {
  const fixes = getExperimentalFixesByIds(fixIds);
  return applyExperimentalFixes(workflow, fixes);
}

/**
 * Apply typeversion upgrades specifically
 */
export function applyTypeVersionUpgrades(workflow: Workflow): FixResult {
  return fixOutdatedTypeVersions.apply(workflow);
}

export { 
  defaultExperimentalFixes, 
  allExperimentalFixes,
  fixOutdatedTypeVersions,
};
