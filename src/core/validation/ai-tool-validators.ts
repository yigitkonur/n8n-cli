/**
 * AI Tool Sub-Node Validators
 *
 * Implements validation logic for all 12 AI tool sub-nodes.
 * Ported from n8n-mcp/src/services/ai-tool-validators.ts
 *
 * Each validator checks configuration requirements, connections, and
 * parameters specific to that tool type.
 */

import { NodeTypeNormalizer } from '../../utils/node-type-normalizer.js';
import type { Workflow, WorkflowNode, ReverseConnection } from '../types.js';

// Validation constants
const MIN_DESCRIPTION_LENGTH_MEDIUM = 15;
const MAX_ITERATIONS_WARNING_THRESHOLD = 50;
const MAX_TOPK_WARNING_THRESHOLD = 20;

/**
 * AI Validation Issue - simplified format for internal use
 * Will be converted to full ValidationIssue when integrated
 */
export interface AIValidationIssue {
  severity: 'error' | 'warning' | 'info';
  nodeId?: string;
  nodeName?: string;
  message: string;
  code?: string;
}

/**
 * 1. HTTP Request Tool Validator
 */
export function validateHTTPRequestTool(node: WorkflowNode): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `HTTP Request Tool "${node.name}" has no toolDescription. Add a clear description to help the LLM know when to use this API.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  } else if (typeof params.toolDescription === 'string' && params.toolDescription.trim().length < MIN_DESCRIPTION_LENGTH_MEDIUM) {
    issues.push({
      severity: 'warning',
      nodeId: node.id,
      nodeName: node.name,
      message: `HTTP Request Tool "${node.name}" toolDescription is too short (minimum ${MIN_DESCRIPTION_LENGTH_MEDIUM} characters). Explain what API this calls and when to use it.`
    });
  }

  // 2. Check URL (REQUIRED)
  if (!params.url) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `HTTP Request Tool "${node.name}" has no URL. Add the API endpoint URL.`,
      code: 'MISSING_URL'
    });
  } else if (typeof params.url === 'string') {
    // Validate URL protocol (must be http or https)
    try {
      const urlObj = new URL(params.url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        issues.push({
          severity: 'error',
          nodeId: node.id,
          nodeName: node.name,
          message: `HTTP Request Tool "${node.name}" has invalid URL protocol "${urlObj.protocol}". Use http:// or https:// only.`,
          code: 'INVALID_URL_PROTOCOL'
        });
      }
    } catch {
      // URL parsing failed - invalid format
      // Only warn if it's not an n8n expression
      if (!params.url.includes('{{')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          nodeName: node.name,
          message: `HTTP Request Tool "${node.name}" has potentially invalid URL format. Ensure it's a valid URL or n8n expression.`
        });
      }
    }
  }

  // 3. Validate placeholders match definitions
  if (params.url || params.body || params.headers) {
    const placeholderRegex = /\{([^}]+)\}/g;
    const placeholders = new Set<string>();

    // Extract placeholders from URL, body, headers
    const textsToCheck = [
      params.url,
      params.body,
      JSON.stringify(params.headers || {})
    ];
    
    for (const text of textsToCheck) {
      if (typeof text === 'string') {
        let match;
        while ((match = placeholderRegex.exec(text)) !== null) {
          placeholders.add(match[1]);
        }
      }
    }

    // If placeholders exist in URL/body/headers
    if (placeholders.size > 0) {
      const definitions = (params.placeholderDefinitions as { values?: Array<{ name: string }> })?.values || [];
      const definedNames = new Set(definitions.map((d) => d.name));

      // If no placeholderDefinitions at all, warn
      if (!params.placeholderDefinitions) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          nodeName: node.name,
          message: `HTTP Request Tool "${node.name}" uses placeholders but has no placeholderDefinitions. Add definitions to describe the expected inputs.`
        });
      } else {
        // Has placeholderDefinitions, check each placeholder
        for (const placeholder of placeholders) {
          if (!definedNames.has(placeholder)) {
            issues.push({
              severity: 'error',
              nodeId: node.id,
              nodeName: node.name,
              message: `HTTP Request Tool "${node.name}" Placeholder "${placeholder}" in URL but it's not defined in placeholderDefinitions.`,
              code: 'UNDEFINED_PLACEHOLDER'
            });
          }
        }

        // Check for defined but unused placeholders
        for (const def of definitions) {
          if (!placeholders.has(def.name)) {
            issues.push({
              severity: 'warning',
              nodeId: node.id,
              nodeName: node.name,
              message: `HTTP Request Tool "${node.name}" defines placeholder "${def.name}" but doesn't use it.`
            });
          }
        }
      }
    }
  }

  // 4. Validate authentication
  if (params.authentication === 'predefinedCredentialType' &&
      (!node.credentials || Object.keys(node.credentials).length === 0)) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `HTTP Request Tool "${node.name}" requires credentials but none are configured.`,
      code: 'MISSING_CREDENTIALS'
    });
  }

  // 5. Validate HTTP method
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  if (params.method && typeof params.method === 'string' && !validMethods.includes(params.method.toUpperCase())) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `HTTP Request Tool "${node.name}" has invalid HTTP method "${params.method}". Use one of: ${validMethods.join(', ')}.`,
      code: 'INVALID_HTTP_METHOD'
    });
  }

  // 6. Validate body for POST/PUT/PATCH
  const method = typeof params.method === 'string' ? params.method.toUpperCase() : '';
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (!params.body && !params.jsonBody) {
      issues.push({
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `HTTP Request Tool "${node.name}" uses ${params.method} but has no body. Consider adding a body or using GET instead.`
      });
    }
  }

  return issues;
}

/**
 * 2. Code Tool Validator
 */
export function validateCodeTool(node: WorkflowNode): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `Code Tool "${node.name}" has no toolDescription. Add one to help the LLM understand the tool's purpose.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  }

  // 2. Check jsCode exists (REQUIRED)
  const jsCode = params.jsCode;
  if (!jsCode || (typeof jsCode === 'string' && jsCode.trim().length === 0)) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `Code Tool "${node.name}" code is empty. Add the JavaScript code to execute.`,
      code: 'MISSING_CODE'
    });
  }

  // 3. Recommend input/output schema
  if (!params.inputSchema && !params.specifyInputSchema) {
    issues.push({
      severity: 'warning',
      nodeId: node.id,
      nodeName: node.name,
      message: `Code Tool "${node.name}" has no input schema. Consider adding one to validate LLM inputs.`
    });
  }

  return issues;
}

/**
 * 3. Vector Store Tool Validator
 */
export function validateVectorStoreTool(
  node: WorkflowNode,
  _reverseConnections?: Map<string, ReverseConnection[]>,
  _workflow?: Workflow
): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `Vector Store Tool "${node.name}" has no toolDescription. Add one to explain what data it searches.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  }

  // 2. Validate topK parameter if specified
  if (params.topK !== undefined) {
    if (typeof params.topK !== 'number' || params.topK < 1) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        nodeName: node.name,
        message: `Vector Store Tool "${node.name}" has invalid topK value. Must be a positive number.`,
        code: 'INVALID_TOPK'
      });
    } else if (params.topK > MAX_TOPK_WARNING_THRESHOLD) {
      issues.push({
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Vector Store Tool "${node.name}" has topK=${params.topK}. Large values (>${MAX_TOPK_WARNING_THRESHOLD}) may overwhelm the LLM context. Consider reducing to 10 or less.`
      });
    }
  }

  return issues;
}

/**
 * 4. Workflow Tool Validator
 */
export function validateWorkflowTool(node: WorkflowNode): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `Workflow Tool "${node.name}" has no toolDescription. Add one to help the LLM know when to use this tool.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  }

  // 2. Check workflowId (REQUIRED)
  if (!params.workflowId) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `Workflow Tool "${node.name}" has no workflowId. Select a workflow to execute.`,
      code: 'MISSING_WORKFLOW_ID'
    });
  }

  return issues;
}

/**
 * 5. AI Agent Tool Validator
 */
export function validateAIAgentTool(
  node: WorkflowNode,
  _reverseConnections?: Map<string, ReverseConnection[]>
): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `AI Agent Tool "${node.name}" has no toolDescription. Add one to help the LLM know when to use this tool.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  }

  // 2. Validate maxIterations if specified
  if (params.maxIterations !== undefined) {
    if (typeof params.maxIterations !== 'number' || params.maxIterations < 1) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        nodeName: node.name,
        message: `AI Agent Tool "${node.name}" has invalid maxIterations. Must be a positive number.`,
        code: 'INVALID_MAX_ITERATIONS'
      });
    } else if (params.maxIterations > MAX_ITERATIONS_WARNING_THRESHOLD) {
      issues.push({
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `AI Agent Tool "${node.name}" has maxIterations=${params.maxIterations}. Large values (>${MAX_ITERATIONS_WARNING_THRESHOLD}) may lead to long execution times.`
      });
    }
  }

  return issues;
}

/**
 * 6. MCP Client Tool Validator
 */
export function validateMCPClientTool(node: WorkflowNode): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `MCP Client Tool "${node.name}" has no toolDescription. Add one to help the LLM know when to use this tool.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  }

  // 2. Check serverUrl (REQUIRED)
  if (!params.serverUrl) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `MCP Client Tool "${node.name}" has no serverUrl. Configure the MCP server URL.`,
      code: 'MISSING_SERVER_URL'
    });
  }

  return issues;
}

/**
 * 7. Calculator Tool Validator (no-op - self-contained)
 */
export function validateCalculatorTool(_node: WorkflowNode): AIValidationIssue[] {
  // Calculator Tool has a built-in description and is self-explanatory
  return [];
}

/**
 * 8. Think Tool Validator (no-op - self-contained)
 */
export function validateThinkTool(_node: WorkflowNode): AIValidationIssue[] {
  // Think Tool has a built-in description and is self-explanatory
  return [];
}

/**
 * 9. SerpApi Tool Validator
 */
export function validateSerpApiTool(node: WorkflowNode): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `SerpApi Tool "${node.name}" has no toolDescription. Add one to explain when to use Google search.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  }

  // 2. Check credentials (RECOMMENDED)
  if (!node.credentials || !(node.credentials as Record<string, unknown>).serpApiApi) {
    issues.push({
      severity: 'warning',
      nodeId: node.id,
      nodeName: node.name,
      message: `SerpApi Tool "${node.name}" requires SerpApi credentials. Configure your API key.`
    });
  }

  return issues;
}

/**
 * 10. Wikipedia Tool Validator
 */
export function validateWikipediaTool(node: WorkflowNode): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `Wikipedia Tool "${node.name}" has no toolDescription. Add one to explain when to use Wikipedia.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  }

  // 2. Validate language if specified
  if (params.language && typeof params.language === 'string') {
    const validLanguageCodes = /^[a-z]{2,3}$/;
    if (!validLanguageCodes.test(params.language)) {
      issues.push({
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Wikipedia Tool "${node.name}" has potentially invalid language code "${params.language}". Use ISO 639 codes (e.g., "en", "es", "fr").`
      });
    }
  }

  return issues;
}

/**
 * 11. SearXNG Tool Validator
 */
export function validateSearXngTool(node: WorkflowNode): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};

  // 1. Check toolDescription (REQUIRED)
  if (!params.toolDescription) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `SearXNG Tool "${node.name}" has no toolDescription. Add one to explain when to use SearXNG.`,
      code: 'MISSING_TOOL_DESCRIPTION'
    });
  }

  // 2. Check baseUrl (REQUIRED)
  if (!params.baseUrl) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `SearXNG Tool "${node.name}" has no baseUrl. Configure your SearXNG instance URL.`,
      code: 'MISSING_BASE_URL'
    });
  }

  return issues;
}

/**
 * 12. WolframAlpha Tool Validator
 */
export function validateWolframAlphaTool(node: WorkflowNode): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const params = node.parameters || {};
  const creds = node.credentials as Record<string, unknown> | undefined;

  // 1. Check credentials (REQUIRED)
  if (!creds || (!creds.wolframAlpha && !creds.wolframAlphaApi)) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      nodeName: node.name,
      message: `WolframAlpha Tool "${node.name}" requires Wolfram|Alpha API credentials. Configure your App ID.`,
      code: 'MISSING_CREDENTIALS'
    });
  }

  // 2. Check description (INFO)
  if (!params.description && !params.toolDescription) {
    issues.push({
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: `WolframAlpha Tool "${node.name}" has no custom description. Add one to explain when to use Wolfram|Alpha for computational queries.`
    });
  }

  return issues;
}

/**
 * Map node types to validator functions
 */
export const AI_TOOL_VALIDATORS: Record<string, (node: WorkflowNode, reverseConnections?: Map<string, ReverseConnection[]>, workflow?: Workflow) => AIValidationIssue[]> = {
  'nodes-langchain.toolHttpRequest': validateHTTPRequestTool,
  'nodes-langchain.toolCode': validateCodeTool,
  'nodes-langchain.toolVectorStore': validateVectorStoreTool,
  'nodes-langchain.toolWorkflow': validateWorkflowTool,
  'nodes-langchain.agentTool': validateAIAgentTool,
  'nodes-langchain.mcpClientTool': validateMCPClientTool,
  'nodes-langchain.toolCalculator': validateCalculatorTool,
  'nodes-langchain.toolThink': validateThinkTool,
  'nodes-langchain.toolSerpApi': validateSerpApiTool,
  'nodes-langchain.toolWikipedia': validateWikipediaTool,
  'nodes-langchain.toolSearXng': validateSearXngTool,
  'nodes-langchain.toolWolframAlpha': validateWolframAlphaTool,
};

/**
 * Check if a node type is an AI tool sub-node
 */
export function isAIToolSubNode(nodeType: string): boolean {
  const normalized = NodeTypeNormalizer.normalizeToShortForm(nodeType);
  return normalized in AI_TOOL_VALIDATORS;
}

/**
 * Validate an AI tool sub-node with the appropriate validator
 */
export function validateAIToolSubNode(
  node: WorkflowNode,
  nodeType: string,
  reverseConnections: Map<string, ReverseConnection[]>,
  workflow: Workflow
): AIValidationIssue[] {
  const normalized = NodeTypeNormalizer.normalizeToShortForm(nodeType);
  const validator = AI_TOOL_VALIDATORS[normalized];
  
  if (validator) {
    return validator(node, reverseConnections, workflow);
  }
  
  return [];
}
