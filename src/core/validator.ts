import type { Workflow, ValidationResult, ValidationIssue, IssueSeverity, VersionIssue, ValidationMode, ValidationProfile } from './types.js';
import { createSourceMap, findSourceLocation, extractSnippet, type SourceMap } from './source-location.js';
import { validateNodeWithN8n } from './n8n-native-validator.js';
import { NodeVersionService } from './versioning/index.js';
import { hasAINodes, validateAISpecificNodes } from './validation/ai-nodes.js';
import { ExpressionFormatValidator, EnhancedConfigValidator, type EnhancedValidationResult } from './validation/index.js';
import { nodeRegistry } from './n8n-loader.js';

interface IssueBuilder {
  code: string;
  severity: IssueSeverity;
  message: string;
  location?: ValidationIssue['location'];
  context?: ValidationIssue['context'];
  validAlternatives?: string[];
  hint?: string;
  suggestions?: ValidationIssue['suggestions'];
}

function enrichWithSourceInfo(
  issue: IssueBuilder,
  sourceMap: SourceMap | undefined,
  path: string
): ValidationIssue {
  const result: ValidationIssue = {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    location: issue.location,
    context: issue.context,
    validAlternatives: issue.validAlternatives,
    hint: issue.hint,
    suggestions: issue.suggestions,
  };

  if (sourceMap && path) {
    const srcLoc = findSourceLocation(sourceMap, path);
    if (srcLoc) {
      result.sourceLocation = srcLoc;
      result.sourceSnippet = extractSnippet(sourceMap, srcLoc.line, 3);
    }
  }

  return result;
}

export interface ValidateOptions {
  rawSource?: string;  // Original JSON source for line number extraction
  checkVersions?: boolean;  // Check for outdated node typeVersions
  versionSeverity?: 'info' | 'warning' | 'error';  // Minimum severity for version issues
  skipCommunityNodes?: boolean;  // Skip version checks for non n8n-nodes-base nodes
  validateExpressions?: boolean;  // Enable expression format validation (default: true)
  /** Pre-computed node type suggestions (Map: invalidType -> suggestions) */
  nodeSuggestions?: Map<string, ValidationIssue['suggestions']>;
  
  // Enhanced validation options
  /** Enable enhanced validation with profiles and modes (default: false for backward compatibility) */
  enhanced?: boolean;
  /** Validation mode: 'minimal' | 'operation' | 'full' (default: 'operation') */
  mode?: ValidationMode;
  /** Validation profile: 'minimal' | 'runtime' | 'ai-friendly' | 'strict' (default: 'runtime') */
  profile?: ValidationProfile;
}

/** Extended validation result with enhanced validation data */
export interface ExtendedValidationResult extends ValidationResult {
  /** Enhanced validation results per node (only when enhanced=true) */
  enhancedResults?: Map<string, EnhancedValidationResult>;
  /** Aggregated autofix suggestions */
  autofix?: Record<string, unknown>;
  /** Aggregated next steps */
  nextSteps?: string[];
}

export function validateWorkflowStructure(data: unknown, options?: ValidateOptions): ValidationResult {
  const issues: ValidationIssue[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeTypeIssues: string[] = [];

  // Create source map if raw source provided
  const sourceMap = options?.rawSource ? createSourceMap(options.rawSource) : undefined;

  if (typeof data !== 'object' || data === null) {
    const issue = enrichWithSourceInfo({
      code: 'INVALID_JSON_TYPE',
      severity: 'error',
      message: 'Workflow must be a JSON object',
      context: { 
        value: typeof data, 
        expected: 'object',
      }
    }, sourceMap, '');
    issues.push(issue);
    errors.push(issue.message);
    return { valid: false, errors, warnings, issues, nodeTypeIssues };
  }

  const wf = data as Workflow;

  // Validate 'nodes' property
  if (wf.nodes === undefined) {
    const issue = enrichWithSourceInfo({
      code: 'MISSING_PROPERTY',
      severity: 'error',
      message: 'Missing required property: nodes',
      location: { path: 'nodes' },
      context: {
        expected: 'Array of node objects',
      }
    }, sourceMap, '');
    issues.push(issue);
    errors.push(issue.message);
  } else if (!Array.isArray(wf.nodes)) {
    const issue = enrichWithSourceInfo({
      code: 'INVALID_TYPE',
      severity: 'error',
      message: 'Property "nodes" must be an array',
      location: { path: 'nodes' },
      context: { value: typeof wf.nodes, expected: 'array' }
    }, sourceMap, 'nodes');
    issues.push(issue);
    errors.push(issue.message);
  }

  // Validate 'connections' property
  if (wf.connections === undefined) {
    const issue = enrichWithSourceInfo({
      code: 'MISSING_PROPERTY',
      severity: 'error',
      message: 'Missing required property: connections',
      location: { path: 'connections' },
      context: {
        expected: 'Object mapping node names to their output connections',
      }
    }, sourceMap, '');
    issues.push(issue);
    errors.push(issue.message);
  } else if (typeof wf.connections !== 'object' || wf.connections === null) {
    const issue = enrichWithSourceInfo({
      code: 'INVALID_TYPE',
      severity: 'error',
      message: 'Property "connections" must be an object',
      location: { path: 'connections' },
      context: { value: typeof wf.connections, expected: 'object' }
    }, sourceMap, 'connections');
    issues.push(issue);
    errors.push(issue.message);
  } else if (Array.isArray(wf.connections)) {
    const issue = enrichWithSourceInfo({
      code: 'INVALID_TYPE',
      severity: 'error',
      message: 'Property "connections" must be an object, not an array',
      location: { path: 'connections' },
      context: { value: 'array', expected: 'object' }
    }, sourceMap, 'connections');
    issues.push(issue);
    errors.push(issue.message);
  }

  // Validate individual nodes
  if (Array.isArray(wf.nodes)) {
    for (let i = 0; i < wf.nodes.length; i++) {
      const node = wf.nodes[i];
      const nodePath = `nodes[${i}]`;
      
      if (!node || typeof node !== 'object') {
        const issue = enrichWithSourceInfo({
          code: 'INVALID_NODE_TYPE',
          severity: 'error',
          message: `Node at index ${i} is not an object`,
          location: { path: nodePath, nodeIndex: i },
          context: { value: typeof node, expected: 'object' }
        }, sourceMap, nodePath);
        issues.push(issue);
        errors.push(issue.message);
        continue;
      }

      const nodeName = node.name || 'unnamed';
      const nodeType = node.type || 'unknown';
      const baseLocation = {
        nodeName,
        nodeId: node.id,
        nodeType,
        nodeIndex: i,
        path: nodePath
      };

      // Check 'type'
      if (!node.type) {
        const issue = enrichWithSourceInfo({
          code: 'MISSING_NODE_TYPE',
          severity: 'error',
          message: `Node at index ${i} (${nodeName}) missing required field: type`,
          location: { ...baseLocation, path: `${nodePath}.type` },
          context: { fullObject: node }
        }, sourceMap, nodePath);
        issues.push(issue);
        errors.push(issue.message);
      } else if (typeof node.type !== 'string') {
        const issue = enrichWithSourceInfo({
          code: 'INVALID_NODE_TYPE_FORMAT',
          severity: 'error',
          message: `Node at index ${i} (${nodeName}) field 'type' must be a string`,
          location: { ...baseLocation, path: `${nodePath}.type` },
          context: { value: typeof node.type, fullObject: node }
        }, sourceMap, `${nodePath}.type`);
        issues.push(issue);
        errors.push(issue.message);
      } else {
        // Get pre-computed suggestions for this node type if available
        const suggestions = options?.nodeSuggestions?.get(node.type);
        const topSuggestion = suggestions?.[0];
        const hintText = topSuggestion 
          ? `Did you mean: ${topSuggestion.value}? (${Math.round(topSuggestion.confidence * 100)}% match)`
          : undefined;

        if (!node.type.includes('.')) {
          const issue = enrichWithSourceInfo({
            code: 'INVALID_NODE_TYPE_FORMAT',
            severity: 'warning',
            message: `Node "${nodeName}" has invalid type "${node.type}" - must include package prefix (e.g., "n8n-nodes-base.webhook")`,
            location: { ...baseLocation, path: `${nodePath}.type` },
            context: { value: node.type, expected: 'Format: "package-name.nodeName"', fullObject: node },
            suggestions,
            hint: hintText,
          }, sourceMap, `${nodePath}.type`);
          issues.push(issue);
          nodeTypeIssues.push(issue.message);
        } else if (node.type.startsWith('nodes-base.')) {
          // Short form detected - suggest the correct full form
          const correctType = `n8n-${node.type}`;
          const issue = enrichWithSourceInfo({
            code: 'DEPRECATED_NODE_TYPE_PREFIX',
            severity: 'warning',
            message: `Node "${nodeName}" has invalid type "${node.type}" - should be "${correctType}"`,
            location: { ...baseLocation, path: `${nodePath}.type` },
            context: { value: node.type, expected: correctType, fullObject: node },
            suggestions: suggestions || [{
              value: correctType,
              confidence: 0.95,
              reason: 'Short form used - API requires full form',
              autoFixable: true,
            }],
            hint: `Use "${correctType}" instead`,
          }, sourceMap, `${nodePath}.type`);
          issues.push(issue);
          nodeTypeIssues.push(issue.message);
        } else if (suggestions && suggestions.length > 0) {
          // Unknown node type with suggestions available - treat as error so valid:false
          const issue = enrichWithSourceInfo({
            code: 'UNKNOWN_NODE_TYPE',
            severity: 'error',
            message: `Node "${nodeName}" has unknown type "${node.type}"`,
            location: { ...baseLocation, path: `${nodePath}.type` },
            context: { value: node.type, fullObject: node },
            suggestions,
            hint: hintText,
          }, sourceMap, `${nodePath}.type`);
          issues.push(issue);
          errors.push(issue.message);
          nodeTypeIssues.push(issue.message);
        }
      }

      // Check 'name'
      if (!node.name) {
        const issue = enrichWithSourceInfo({
          code: 'MISSING_NODE_NAME',
          severity: 'warning',
          message: `Node at index ${i} (type: ${nodeType}) missing 'name' field - will be auto-generated`,
          location: { ...baseLocation, path: `${nodePath}.name` },
          context: { fullObject: node }
        }, sourceMap, nodePath);
        issues.push(issue);
        warnings.push(issue.message);
      }

      // Check 'typeVersion'
      if (node.typeVersion === undefined) {
        const issue = enrichWithSourceInfo({
          code: 'MISSING_TYPE_VERSION',
          severity: 'error',
          message: `Node "${nodeName}" missing required field: typeVersion`,
          location: { ...baseLocation, path: `${nodePath}.typeVersion` },
          context: { fullObject: node }
        }, sourceMap, nodePath);
        issues.push(issue);
        errors.push(issue.message);
      } else if (typeof node.typeVersion !== 'number') {
        const issue = enrichWithSourceInfo({
          code: 'INVALID_TYPE_VERSION',
          severity: 'error',
          message: `Node "${nodeName}" field 'typeVersion' must be a number`,
          location: { ...baseLocation, path: `${nodePath}.typeVersion` },
          context: { value: typeof node.typeVersion, fullObject: node }
        }, sourceMap, `${nodePath}.typeVersion`);
        issues.push(issue);
        errors.push(issue.message);
      }

      // Check 'position'
      if (!node.position) {
        const issue = enrichWithSourceInfo({
          code: 'MISSING_POSITION',
          severity: 'error',
          message: `Node "${nodeName}" missing required field: position`,
          location: { ...baseLocation, path: `${nodePath}.position` },
          context: { fullObject: node }
        }, sourceMap, nodePath);
        issues.push(issue);
        errors.push(issue.message);
      } else if (!Array.isArray(node.position) || node.position.length !== 2) {
        const issue = enrichWithSourceInfo({
          code: 'INVALID_POSITION',
          severity: 'error',
          message: `Node "${nodeName}" field 'position' must be an array of [x, y]`,
          location: { ...baseLocation, path: `${nodePath}.position` },
          context: { value: node.position, expected: '[number, number]', fullObject: node }
        }, sourceMap, `${nodePath}.position`);
        issues.push(issue);
        errors.push(issue.message);
      }

      // Check 'parameters'
      if (node.parameters === undefined) {
        const issue = enrichWithSourceInfo({
          code: 'MISSING_PARAMETERS',
          severity: 'error',
          message: `Node "${nodeName}" missing required field: parameters`,
          location: { ...baseLocation, path: `${nodePath}.parameters` },
          context: { fullObject: node }
        }, sourceMap, nodePath);
        issues.push(issue);
        errors.push(issue.message);
      } else if (typeof node.parameters !== 'object' || node.parameters === null) {
        const issue = enrichWithSourceInfo({
          code: 'INVALID_PARAMETERS',
          severity: 'error',
          message: `Node "${nodeName}" field 'parameters' must be an object`,
          location: { ...baseLocation, path: `${nodePath}.parameters` },
          context: { value: typeof node.parameters, fullObject: node }
        }, sourceMap, `${nodePath}.parameters`);
        issues.push(issue);
        errors.push(issue.message);
      } else {
        // Delegate to native n8n validation for parameter-level issues
        const nativeIssues = validateNodeWithN8n(node as any);

        for (const nativeIssue of nativeIssues) {
          const relativePath = nativeIssue.location?.path ?? '';
          const fullPath = relativePath ? `${nodePath}.${relativePath}` : nodePath;

          // Add suggestions to UNKNOWN_NODE_TYPE issues if available
          let suggestions = nativeIssue.suggestions;
          let hint = nativeIssue.hint;
          if (nativeIssue.code === 'UNKNOWN_NODE_TYPE' && options?.nodeSuggestions) {
            const nodeSuggestions = options.nodeSuggestions.get(node.type);
            if (nodeSuggestions && nodeSuggestions.length > 0) {
              suggestions = nodeSuggestions;
              const topSuggestion = nodeSuggestions[0];
              hint = `Did you mean: ${topSuggestion.value}? (${Math.round(topSuggestion.confidence * 100)}% match)`;
            }
          }

          const enriched = enrichWithSourceInfo(
            {
              code: nativeIssue.code,
              severity: nativeIssue.severity,
              message: nativeIssue.message,
              location: { ...baseLocation, ...nativeIssue.location, path: fullPath },
              context: nativeIssue.context,
              validAlternatives: nativeIssue.validAlternatives,
              suggestions,
              hint,
            },
            sourceMap,
            fullPath,
          );

          issues.push(enriched);
          if (enriched.severity === 'error') {
            errors.push(enriched.message);
          } else if (enriched.severity === 'warning') {
            warnings.push(enriched.message);
          }
        }

        // Expression format validation (enabled by default)
        if (options?.validateExpressions !== false) {
          const exprContext = {
            nodeType,
            nodeName,
            nodeId: node.id,
          };

          const exprIssues = ExpressionFormatValidator.validateNodeParameters(
            node.parameters,
            exprContext
          );

          for (const exprIssue of exprIssues) {
            const issueCode = exprIssue.issueType === 'missing-prefix'
              ? 'EXPRESSION_MISSING_PREFIX'
              : exprIssue.issueType === 'needs-resource-locator'
              ? 'EXPRESSION_NEEDS_RESOURCE_LOCATOR'
              : exprIssue.issueType === 'invalid-rl-structure'
              ? 'EXPRESSION_INVALID_STRUCTURE'
              : 'EXPRESSION_FORMAT_ERROR';

            const fullPath = `${nodePath}.parameters.${exprIssue.fieldPath}`;
            const enriched = enrichWithSourceInfo(
              {
                code: issueCode,
                severity: exprIssue.severity,
                message: exprIssue.explanation,
                location: {
                  ...baseLocation,
                  path: fullPath,
                },
                context: {
                  value: exprIssue.currentValue,
                  expected: typeof exprIssue.correctedValue === 'string'
                    ? exprIssue.correctedValue
                    : JSON.stringify(exprIssue.correctedValue),
                },
                hint: exprIssue.confidence
                  ? `Confidence: ${Math.round(exprIssue.confidence * 100)}%`
                  : undefined,
              },
              sourceMap,
              fullPath,
            );

            issues.push(enriched);
            if (exprIssue.severity === 'error') {
              errors.push(enriched.message);
            } else if (exprIssue.severity === 'warning') {
              warnings.push(enriched.message);
            }
          }
        }

        // Enhanced validation (opt-in)
        if (options?.enhanced) {
          try {
            // Get node schema from registry
            nodeRegistry.init();
            const nodeTypeDescription = nodeRegistry.getNodeType(nodeType, node.typeVersion);
            
            if (nodeTypeDescription && nodeTypeDescription.properties) {
              const mode = options.mode || 'operation';
              const profile = options.profile || 'runtime';
              
              const enhancedResult = EnhancedConfigValidator.validateWithMode(
                nodeType,
                node.parameters,
                nodeTypeDescription.properties as any[], // Cast to any[] for compatibility with n8n's INodeProperties
                mode,
                profile
              );

              // Convert enhanced errors to ValidationIssues
              for (const enhancedError of enhancedResult.errors) {
                // Check for duplicates (same property and similar message)
                const isDuplicate = issues.some(
                  existing =>
                    existing.location?.path?.includes(enhancedError.property) &&
                    existing.message.toLowerCase().includes(enhancedError.property.toLowerCase())
                );

                if (!isDuplicate) {
                  const fullPath = `${nodePath}.parameters.${enhancedError.property}`;
                  const enriched = enrichWithSourceInfo(
                    {
                      code: `ENHANCED_${enhancedError.type.toUpperCase()}`,
                      severity: 'error',
                      message: enhancedError.message,
                      location: { ...baseLocation, path: fullPath },
                      hint: enhancedError.fix,
                    },
                    sourceMap,
                    fullPath
                  );
                  issues.push(enriched);
                  errors.push(enriched.message);
                }
              }

              // Convert enhanced warnings to ValidationIssues
              for (const enhancedWarning of enhancedResult.warnings) {
                const isDuplicate = issues.some(
                  existing =>
                    existing.location?.path?.includes(enhancedWarning.property || '') &&
                    existing.severity === 'warning'
                );

                if (!isDuplicate) {
                  const fullPath = enhancedWarning.property
                    ? `${nodePath}.parameters.${enhancedWarning.property}`
                    : nodePath;
                  const enriched = enrichWithSourceInfo(
                    {
                      code: `ENHANCED_${enhancedWarning.type.toUpperCase()}`,
                      severity: 'warning',
                      message: enhancedWarning.message,
                      location: { ...baseLocation, path: fullPath },
                      hint: enhancedWarning.suggestion,
                    },
                    sourceMap,
                    fullPath
                  );
                  issues.push(enriched);
                  warnings.push(enriched.message);
                }
              }
            }
          } catch (enhancedError) {
            // Enhanced validation is optional - don't fail the whole validation
            // Just log if in debug mode
            if (process.env.DEBUG) {
              console.error(`Enhanced validation failed for ${nodeName}:`, enhancedError);
            }
          }
        }
      }
    }
  }

  // Validate connections reference existing nodes (CLI-003)
  if (Array.isArray(wf.nodes) && wf.connections && typeof wf.connections === 'object' && !Array.isArray(wf.connections)) {
    const nodeNames = new Set(wf.nodes.map(n => n?.name).filter(Boolean));
    
    for (const [sourceName, outputs] of Object.entries(wf.connections)) {
      // Check source node exists
      if (!nodeNames.has(sourceName)) {
        const issue = enrichWithSourceInfo({
          code: 'INVALID_CONNECTION_SOURCE',
          severity: 'error',
          message: `Connection references non-existent source node: "${sourceName}"`,
          location: { path: `connections.${sourceName}` },
          hint: `Available nodes: ${Array.from(nodeNames).slice(0, 5).join(', ')}${nodeNames.size > 5 ? '...' : ''}`
        }, sourceMap, `connections.${sourceName}`);
        issues.push(issue);
        errors.push(issue.message);
        continue;
      }
      
      // Check target nodes in connection outputs
      if (outputs && typeof outputs === 'object') {
        for (const [outputType, branches] of Object.entries(outputs as Record<string, unknown>)) {
          if (!Array.isArray(branches)) {continue;}
          
          for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
            const branch = branches[branchIdx];
            if (!Array.isArray(branch)) {continue;}
            
            for (let connIdx = 0; connIdx < branch.length; connIdx++) {
              const conn = branch[connIdx] as { node?: string } | undefined;
              if (conn?.node && !nodeNames.has(conn.node)) {
                const path = `connections.${sourceName}.${outputType}[${branchIdx}][${connIdx}]`;
                const issue = enrichWithSourceInfo({
                  code: 'INVALID_CONNECTION_TARGET',
                  severity: 'error',
                  message: `Connection from "${sourceName}" references non-existent target node: "${conn.node}"`,
                  location: { path },
                  hint: `Available nodes: ${Array.from(nodeNames).slice(0, 5).join(', ')}${nodeNames.size > 5 ? '...' : ''}`
                }, sourceMap, path);
                issues.push(issue);
                errors.push(issue.message);
              }
            }
          }
        }
      }
    }
  }

  // Version checking for outdated node typeVersions
  const versionIssues: VersionIssue[] = [];
  if (options?.checkVersions && Array.isArray(wf.nodes)) {
    const versionService = new NodeVersionService();
    const severity = options.versionSeverity || 'warning';
    
    for (const node of wf.nodes) {
      if (!node || typeof node !== 'object') {continue;}
      if (!node.type || typeof node.type !== 'string') {continue;}
      
      // Skip community nodes if requested
      if (options.skipCommunityNodes && !node.type.startsWith('n8n-nodes-base.')) {continue;}
      
      // Skip nodes without typeVersion
      if (node.typeVersion === undefined) {continue;}
      
      const currentVersion = String(node.typeVersion);
      
      // Check if node is tracked in registry
      if (!versionService.isNodeTracked(node.type)) {continue;}
      
      // Analyze version
      const analysis = versionService.analyzeVersion(node.type, currentVersion);
      
      if (analysis.isOutdated) {
        const versionIssue: VersionIssue = {
          code: 'OUTDATED_TYPE_VERSION',
          severity,
          nodeName: node.name || 'unnamed',
          nodeType: node.type,
          currentVersion: analysis.currentVersion,
          latestVersion: analysis.latestVersion,
          hasBreakingChanges: analysis.hasBreakingChanges,
          autoMigratable: !analysis.hasBreakingChanges,
          hint: analysis.reason,
        };
        versionIssues.push(versionIssue);
        
        // Add to general warnings/errors based on severity
        const message = `Node "${node.name}": typeVersion ${currentVersion} is outdated (latest: ${analysis.latestVersion})${analysis.hasBreakingChanges ? ' ⚠️ breaking changes' : ''}`;
        if (severity === 'error') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }
  }

  // AI-specific validation (AI Agent, Chat Trigger, Basic LLM Chain, AI Tools)
  if (Array.isArray(wf.nodes) && hasAINodes(wf)) {
    const aiIssues = validateAISpecificNodes(wf);
    
    for (const aiIssue of aiIssues) {
      // Find the node index for source location enrichment
      let nodePath = '';
      if (aiIssue.nodeName) {
        const nodeIndex = wf.nodes.findIndex(n => n?.name === aiIssue.nodeName);
        nodePath = nodeIndex >= 0 ? `nodes[${nodeIndex}]` : '';
      }

      const enriched = enrichWithSourceInfo({
        code: aiIssue.code || 'AI_VALIDATION_ERROR',
        severity: aiIssue.severity,
        message: aiIssue.message,
        location: {
          nodeName: aiIssue.nodeName,
          nodeId: aiIssue.nodeId,
          path: nodePath,
        },
      }, sourceMap, nodePath);

      issues.push(enriched);
      if (aiIssue.severity === 'error') {
        errors.push(aiIssue.message);
      } else if (aiIssue.severity === 'warning') {
        warnings.push(aiIssue.message);
      }
    }
  }

  return { 
    valid: errors.length === 0, 
    errors, 
    warnings, 
    issues,
    nodeTypeIssues: nodeTypeIssues.length > 0 ? nodeTypeIssues : undefined,
    versionIssues: versionIssues.length > 0 ? versionIssues : undefined,
  };
}

