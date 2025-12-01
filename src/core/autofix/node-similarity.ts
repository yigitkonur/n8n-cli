/**
 * Node Similarity Service
 * 
 * Provides typo detection and node type suggestions using Levenshtein distance
 * and common mistake patterns.
 * 
 * Ported from n8n-mcp/src/services/node-similarity-service.ts with CLI adaptations.
 */

import type { NodeSuggestion, CommonMistakePattern } from './types.js';
import type { NodeRepository, NodeSearchResult } from '../db/nodes.js';

/**
 * Similarity score breakdown
 */
export interface SimilarityScore {
  nameSimilarity: number;
  categoryMatch: number;
  packageMatch: number;
  patternMatch: number;
  totalScore: number;
}

/**
 * Node Similarity Service
 * 
 * Finds similar nodes for typo correction using:
 * 1. Common mistake patterns (exact matches)
 * 2. Levenshtein distance (fuzzy matching)
 * 3. Category/package matching
 */
export class NodeSimilarityService {
  /** Minimum score (0-100) to suggest a node */
  private static readonly SCORING_THRESHOLD = 50;
  
  /** Max character differences for typo detection */
  private static readonly TYPO_EDIT_DISTANCE = 2;
  
  /** Short search term length threshold */
  private static readonly SHORT_SEARCH_LENGTH = 5;
  
  /** Minimum confidence for auto-fix (90%) */
  private static readonly AUTO_FIX_CONFIDENCE = 0.9;

  private repository: NodeRepository;
  private commonMistakes: Map<string, CommonMistakePattern[]>;
  private nodeCache: NodeSearchResult[] | null = null;

  constructor(repository: NodeRepository) {
    this.repository = repository;
    this.commonMistakes = this.initializeCommonMistakes();
  }

  /**
   * Initialize common mistake patterns
   */
  private initializeCommonMistakes(): Map<string, CommonMistakePattern[]> {
    const patterns = new Map<string, CommonMistakePattern[]>();

    // Common nodes without prefix
    patterns.set('missing_prefix', [
      { pattern: 'httprequest', suggestion: 'n8n-nodes-base.httpRequest', confidence: 0.95, reason: 'Missing package prefix' },
      { pattern: 'webhook', suggestion: 'n8n-nodes-base.webhook', confidence: 0.95, reason: 'Missing package prefix' },
      { pattern: 'slack', suggestion: 'n8n-nodes-base.slack', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'gmail', suggestion: 'n8n-nodes-base.gmail', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'googlesheets', suggestion: 'n8n-nodes-base.googleSheets', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'telegram', suggestion: 'n8n-nodes-base.telegram', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'discord', suggestion: 'n8n-nodes-base.discord', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'notion', suggestion: 'n8n-nodes-base.notion', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'airtable', suggestion: 'n8n-nodes-base.airtable', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'postgres', suggestion: 'n8n-nodes-base.postgres', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'mysql', suggestion: 'n8n-nodes-base.mySql', confidence: 0.9, reason: 'Missing package prefix' },
      { pattern: 'mongodb', suggestion: 'n8n-nodes-base.mongoDb', confidence: 0.9, reason: 'Missing package prefix' },
    ]);

    // Case variations
    patterns.set('case_variations', [
      { pattern: 'HttpRequest', suggestion: 'n8n-nodes-base.httpRequest', confidence: 0.95, reason: 'Incorrect capitalization' },
      { pattern: 'HTTPRequest', suggestion: 'n8n-nodes-base.httpRequest', confidence: 0.95, reason: 'Incorrect capitalization' },
      { pattern: 'Webhook', suggestion: 'n8n-nodes-base.webhook', confidence: 0.95, reason: 'Incorrect capitalization' },
      { pattern: 'WebHook', suggestion: 'n8n-nodes-base.webhook', confidence: 0.95, reason: 'Incorrect capitalization' },
    ]);

    // Common typos
    patterns.set('typos', [
      { pattern: 'htprequest', suggestion: 'n8n-nodes-base.httpRequest', confidence: 0.85, reason: 'Likely typo' },
      { pattern: 'httpreqest', suggestion: 'n8n-nodes-base.httpRequest', confidence: 0.85, reason: 'Likely typo' },
      { pattern: 'webook', suggestion: 'n8n-nodes-base.webhook', confidence: 0.85, reason: 'Likely typo' },
      { pattern: 'slak', suggestion: 'n8n-nodes-base.slack', confidence: 0.85, reason: 'Likely typo' },
      { pattern: 'gogle', suggestion: 'n8n-nodes-base.google', confidence: 0.8, reason: 'Likely typo' },
      { pattern: 'telegramm', suggestion: 'n8n-nodes-base.telegram', confidence: 0.85, reason: 'Likely typo' },
    ]);

    // AI/LangChain specific
    patterns.set('ai_nodes', [
      { pattern: 'openai', suggestion: '@n8n/n8n-nodes-langchain.openAi', confidence: 0.85, reason: 'AI node - use LangChain package' },
      { pattern: 'n8n-nodes-base.openai', suggestion: '@n8n/n8n-nodes-langchain.openAi', confidence: 0.9, reason: 'Wrong package - OpenAI is in LangChain' },
      { pattern: 'chatopenai', suggestion: '@n8n/n8n-nodes-langchain.lmChatOpenAi', confidence: 0.85, reason: 'LangChain node naming' },
    ]);

    return patterns;
  }

  /**
   * Find similar nodes for an invalid type
   */
  async findSimilarNodes(invalidType: string, limit: number = 5): Promise<NodeSuggestion[]> {
    if (!invalidType || invalidType.trim() === '') {
      return [];
    }

    const suggestions: NodeSuggestion[] = [];

    // First, check for exact common mistakes
    const mistakeSuggestion = this.checkCommonMistakes(invalidType);
    if (mistakeSuggestion) {
      suggestions.push(mistakeSuggestion);
    }

    // Get all nodes (with caching)
    const allNodes = await this.getCachedNodes();

    // Calculate similarity scores for all nodes
    const scores = allNodes.map(node => ({
      node,
      score: this.calculateSimilarityScore(invalidType, node),
    }));

    // Sort by total score and filter high scores
    scores.sort((a, b) => b.score.totalScore - a.score.totalScore);

    // Add top suggestions (excluding already added)
    for (const { node, score } of scores) {
      if (suggestions.some(s => s.nodeType === node.nodeType)) {
        continue;
      }

      if (score.totalScore >= NodeSimilarityService.SCORING_THRESHOLD) {
        suggestions.push(this.createSuggestion(node, score));
      }

      if (suggestions.length >= limit) {
        break;
      }
    }

    return suggestions;
  }

  /**
   * Check for common mistake patterns
   */
  private checkCommonMistakes(invalidType: string): NodeSuggestion | null {
    const cleanType = invalidType.trim();
    const lowerType = cleanType.toLowerCase();

    // Check all pattern categories
    for (const [category, patterns] of this.commonMistakes) {
      for (const pattern of patterns) {
        // Case-insensitive match for most, case-sensitive for case_variations
        const match = category === 'case_variations'
          ? cleanType === pattern.pattern
          : lowerType === pattern.pattern.toLowerCase();

        if (match && pattern.suggestion) {
          const node = this.repository.getNode(pattern.suggestion);
          if (node) {
            return {
              nodeType: pattern.suggestion,
              displayName: node.displayName,
              confidence: pattern.confidence,
              reason: pattern.reason,
              category: node.category,
              description: node.description,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Calculate multi-factor similarity score
   */
  private calculateSimilarityScore(invalidType: string, node: NodeSearchResult): SimilarityScore {
    const cleanInvalid = this.normalizeNodeType(invalidType);
    const cleanValid = this.normalizeNodeType(node.nodeType);
    const displayNameClean = this.normalizeNodeType(node.displayName);

    const isShortSearch = invalidType.length <= NodeSimilarityService.SHORT_SEARCH_LENGTH;

    // Name similarity (40% weight)
    let nameSimilarity = Math.max(
      this.getStringSimilarity(cleanInvalid, cleanValid),
      this.getStringSimilarity(cleanInvalid, displayNameClean)
    ) * 40;

    // Boost for short searches that are substrings
    if (isShortSearch && (cleanValid.includes(cleanInvalid) || displayNameClean.includes(cleanInvalid))) {
      nameSimilarity = Math.max(nameSimilarity, 10);
    }

    // Category match (20% weight)
    let categoryMatch = 0;
    if (node.category) {
      const categoryClean = this.normalizeNodeType(node.category);
      if (cleanInvalid.includes(categoryClean) || categoryClean.includes(cleanInvalid)) {
        categoryMatch = 20;
      }
    }

    // Package match (15% weight)
    let packageMatch = 0;
    const invalidParts = cleanInvalid.split(/[.-]/);
    const validParts = cleanValid.split(/[.-]/);
    if (invalidParts[0] === validParts[0]) {
      packageMatch = 15;
    }

    // Pattern match (25% weight)
    let patternMatch = 0;
    if (cleanValid.includes(cleanInvalid) || displayNameClean.includes(cleanInvalid)) {
      patternMatch = isShortSearch ? 45 : 25;
    } else if (this.getEditDistance(cleanInvalid, cleanValid) <= NodeSimilarityService.TYPO_EDIT_DISTANCE) {
      patternMatch = 20;
    } else if (this.getEditDistance(cleanInvalid, displayNameClean) <= NodeSimilarityService.TYPO_EDIT_DISTANCE) {
      patternMatch = 18;
    }

    // Start-of-string match boost for short searches
    if (isShortSearch && (cleanValid.startsWith(cleanInvalid) || displayNameClean.startsWith(cleanInvalid))) {
      patternMatch = Math.max(patternMatch, 40);
    }

    const totalScore = nameSimilarity + categoryMatch + packageMatch + patternMatch;

    return {
      nameSimilarity,
      categoryMatch,
      packageMatch,
      patternMatch,
      totalScore,
    };
  }

  /**
   * Create a suggestion from node and score
   */
  private createSuggestion(node: NodeSearchResult, score: SimilarityScore): NodeSuggestion {
    let reason = 'Similar node';

    if (score.patternMatch >= 20) {
      reason = 'Name similarity';
    } else if (score.categoryMatch >= 15) {
      reason = 'Same category';
    } else if (score.packageMatch >= 10) {
      reason = 'Same package';
    }

    const confidence = Math.min(score.totalScore / 100, 1);

    return {
      nodeType: node.nodeType.includes('.') 
        ? `n8n-nodes-base.${node.nodeType}` 
        : node.nodeType,
      displayName: node.displayName,
      confidence,
      reason,
      category: node.category,
      description: node.description,
      autoFixable: confidence >= NodeSimilarityService.AUTO_FIX_CONFIDENCE,
    };
  }

  /**
   * Normalize node type for comparison
   */
  private normalizeNodeType(type: string): string {
    return type
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Calculate string similarity (0-1)
   */
  private getStringSimilarity(s1: string, s2: string): number {
    if (s1 === s2) {return 1;}
    if (!s1 || !s2) {return 0;}

    const distance = this.getEditDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLen);
  }

  /**
   * Calculate Levenshtein distance with optimizations
   */
  private getEditDistance(s1: string, s2: string, maxDistance: number = 5): number {
    if (s1 === s2) {return 0;}

    const m = s1.length;
    const n = s2.length;

    // Fast path: length difference exceeds threshold
    if (Math.abs(m - n) > maxDistance) {return maxDistance + 1;}

    // Fast path: empty strings
    if (m === 0) {return n;}
    if (n === 0) {return m;}

    // Space optimization: only need previous row
    let prev = Array.from({ length: n + 1 }, (_, i) => i);

    for (let i = 1; i <= m; i++) {
      const curr = [i];
      let minInRow = i;

      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        const val = Math.min(
          curr[j - 1] + 1,      // deletion
          prev[j] + 1,          // insertion
          prev[j - 1] + cost    // substitution
        );
        curr.push(val);
        minInRow = Math.min(minInRow, val);
      }

      // Early termination
      if (minInRow > maxDistance) {
        return maxDistance + 1;
      }

      prev = curr;
    }

    return prev[n];
  }

  /**
   * Get cached nodes or fetch from repository
   */
  private async getCachedNodes(): Promise<NodeSearchResult[]> {
    if (!this.nodeCache) {
      this.nodeCache = this.repository.getAllNodes();
    }
    return this.nodeCache;
  }

  /**
   * Clear the node cache
   */
  clearCache(): void {
    this.nodeCache = null;
  }

  /**
   * Check if a suggestion is high confidence for auto-fixing
   */
  isAutoFixable(suggestion: NodeSuggestion): boolean {
    return suggestion.confidence >= NodeSimilarityService.AUTO_FIX_CONFIDENCE;
  }

  /**
   * Format suggestions into a user-friendly message
   */
  formatSuggestionMessage(suggestions: NodeSuggestion[], invalidType: string): string {
    if (suggestions.length === 0) {
      return `Unknown node type: "${invalidType}". No similar nodes found.`;
    }

    let message = `Unknown node type: "${invalidType}"\n\nDid you mean one of these?\n`;

    for (const suggestion of suggestions) {
      const confidence = Math.round(suggestion.confidence * 100);
      message += `• ${suggestion.nodeType} (${confidence}% match)`;

      if (suggestion.displayName) {
        message += ` - ${suggestion.displayName}`;
      }

      message += `\n  → ${suggestion.reason}`;

      if (suggestion.confidence >= 0.9) {
        message += ' (can be auto-fixed)';
      }

      message += '\n';
    }

    return message;
  }
}
