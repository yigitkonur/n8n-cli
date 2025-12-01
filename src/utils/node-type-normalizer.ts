/**
 * Universal Node Type Normalizer - FOR DATABASE OPERATIONS ONLY
 * Copied from n8n-mcp/src/utils/node-type-normalizer.ts
 * 
 * ⚠️ WARNING: Do NOT use before n8n API calls!
 *
 * This class converts node types to SHORT form (database format).
 * The n8n API requires FULL form (n8n-nodes-base.*).
 *
 * **Use this ONLY when:**
 * - Querying the node database
 * - Searching for node information
 * - Looking up node metadata
 *
 * **Do NOT use before:**
 * - Creating workflows (n8n workflows create)
 * - Updating workflows (n8n workflows update)
 * - Any n8n API calls
 *
 * **IMPORTANT:** The database stores nodes in SHORT form:
 * - n8n-nodes-base → nodes-base
 * - @n8n/n8n-nodes-langchain → nodes-langchain
 *
 * But the n8n API requires FULL form:
 * - nodes-base → n8n-nodes-base
 * - nodes-langchain → @n8n/n8n-nodes-langchain
 */

export interface NodeTypeNormalizationResult {
  original: string;
  normalized: string;
  wasNormalized: boolean;
  package: 'base' | 'langchain' | 'community' | 'unknown';
}

export class NodeTypeNormalizer {
  /**
   * Normalize node type to canonical SHORT form (database format)
   *
   * Converts any node type variation to the SHORT form that the database uses.
   *
   * @param type - Node type in any format
   * @returns Normalized node type in short form (database format)
   *
   * @example
   * normalizeToShortForm('n8n-nodes-base.webhook')
   * // → 'nodes-base.webhook'
   *
   * @example
   * normalizeToShortForm('nodes-base.webhook')
   * // → 'nodes-base.webhook' (unchanged)
   */
  static normalizeToShortForm(type: string): string {
    if (!type || typeof type !== 'string') {
      return type;
    }

    // Normalize full forms to short form (database format)
    if (type.startsWith('n8n-nodes-base.')) {
      return type.replace(/^n8n-nodes-base\./, 'nodes-base.');
    }
    if (type.startsWith('@n8n/n8n-nodes-langchain.')) {
      return type.replace(/^@n8n\/n8n-nodes-langchain\./, 'nodes-langchain.');
    }
    // Handle n8n-nodes-langchain without @n8n/ prefix
    if (type.startsWith('n8n-nodes-langchain.')) {
      return type.replace(/^n8n-nodes-langchain\./, 'nodes-langchain.');
    }

    // Already in short form or community node - return unchanged
    return type;
  }

  /**
   * Alias for normalizeToShortForm (backward compatibility)
   */
  static normalizeToFullForm(type: string): string {
    return this.normalizeToShortForm(type);
  }

  /**
   * Convert short form back to full form (for API calls)
   *
   * @param type - Node type in short form
   * @returns Node type in full form (API format)
   *
   * @example
   * expandToApiForm('nodes-base.webhook')
   * // → 'n8n-nodes-base.webhook'
   */
  static expandToApiForm(type: string): string {
    if (!type || typeof type !== 'string') {
      return type;
    }

    if (type.startsWith('nodes-base.')) {
      return type.replace(/^nodes-base\./, 'n8n-nodes-base.');
    }
    if (type.startsWith('nodes-langchain.')) {
      return type.replace(/^nodes-langchain\./, '@n8n/n8n-nodes-langchain.');
    }

    // Already in full form or community node
    return type;
  }

  /**
   * Normalize with detailed result including metadata
   */
  static normalizeWithDetails(type: string): NodeTypeNormalizationResult {
    const original = type;
    const normalized = this.normalizeToShortForm(type);

    return {
      original,
      normalized,
      wasNormalized: original !== normalized,
      package: this.detectPackage(normalized)
    };
  }

  /**
   * Detect package type from node type
   */
  private static detectPackage(type: string): 'base' | 'langchain' | 'community' | 'unknown' {
    // Check both short and full forms
    if (type.startsWith('nodes-base.') || type.startsWith('n8n-nodes-base.')) {return 'base';}
    if (type.startsWith('nodes-langchain.') || type.startsWith('@n8n/n8n-nodes-langchain.') || type.startsWith('n8n-nodes-langchain.')) {return 'langchain';}
    if (type.includes('.')) {return 'community';}
    return 'unknown';
  }

  /**
   * Batch normalize multiple node types
   */
  static normalizeBatch(types: string[]): Map<string, string> {
    const result = new Map<string, string>();
    for (const type of types) {
      result.set(type, this.normalizeToShortForm(type));
    }
    return result;
  }

  /**
   * Normalize all node types in a workflow (for database lookup)
   */
  static normalizeWorkflowNodeTypes(workflow: any): any {
    if (!workflow?.nodes || !Array.isArray(workflow.nodes)) {
      return workflow;
    }

    return {
      ...workflow,
      nodes: workflow.nodes.map((node: any) => ({
        ...node,
        type: this.normalizeToShortForm(node.type)
      }))
    };
  }

  /**
   * Check if a node type is in full form
   */
  static isFullForm(type: string): boolean {
    if (!type || typeof type !== 'string') {
      return false;
    }

    return (
      type.startsWith('n8n-nodes-base.') ||
      type.startsWith('@n8n/n8n-nodes-langchain.') ||
      type.startsWith('n8n-nodes-langchain.')
    );
  }

  /**
   * Check if a node type is in short form (database format)
   */
  static isShortForm(type: string): boolean {
    if (!type || typeof type !== 'string') {
      return false;
    }

    return (
      type.startsWith('nodes-base.') ||
      type.startsWith('nodes-langchain.')
    );
  }

  /**
   * Extract just the node name (without package prefix)
   */
  static extractNodeName(type: string): string {
    if (!type || typeof type !== 'string') {
      return type;
    }
    const parts = type.split('.');
    return parts[parts.length - 1] || type;
  }
}
