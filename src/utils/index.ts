// Error handling
export {
  N8nApiError,
  N8nAuthenticationError,
  N8nNotFoundError,
  N8nValidationError,
  N8nRateLimitError,
  N8nServerError,
  N8nConnectionError,
  handleN8nApiError,
  getUserFriendlyErrorMessage,
  formatExecutionError,
  formatNoExecutionError,
  printError,
  logError,
} from './errors.js';

// Node type normalization
export {
  NodeTypeNormalizer,
} from './node-type-normalizer.js';
export type { NodeTypeNormalizationResult } from './node-type-normalizer.js';

// Spinner utilities
export {
  startSpinner,
  succeedSpinner,
  failSpinner,
  stopSpinner,
  updateSpinner,
  withSpinner,
} from './spinner.js';

// Re-export existing utilities
export { classifyInput, readInput } from './input-reader.js';
export { outputSummary } from './output.js';
