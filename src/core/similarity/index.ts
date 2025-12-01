/**
 * Node Similarity Module
 * 
 * Re-exports from autofix module for backwards compatibility.
 * The main implementation is in src/core/autofix/node-similarity.ts
 */

// Re-export types and service from autofix module
export type {
  NodeSuggestion,
  CommonMistakePattern,
} from '../autofix/types.js';

export type {
  SimilarityScore,
} from '../autofix/node-similarity.js';

export {
  NodeSimilarityService,
} from '../autofix/node-similarity.js';

// Also export a convenience singleton getter
import type { NodeRepository } from '../db/nodes.js';
import { getNodeRepository } from '../db/nodes.js';
import { NodeSimilarityService } from '../autofix/node-similarity.js';

let _similarityService: NodeSimilarityService | null = null;

/**
 * Get NodeSimilarityService singleton
 * Lazily initializes the service with the NodeRepository
 */
export async function getSimilarityService(): Promise<NodeSimilarityService> {
  if (!_similarityService) {
    const repo = await getNodeRepository();
    _similarityService = new NodeSimilarityService(repo);
  }
  return _similarityService;
}
