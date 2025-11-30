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
  printError,
  sanitizeForLogging,
} from './errors.js';

// Node type normalization
export { NodeTypeNormalizer } from './node-type-normalizer.js';
export type { NodeTypeNormalizationResult } from './node-type-normalizer.js';

// Interactive prompts
export { confirmAction, displayChangeSummary } from './prompts.js';
export type { ConfirmOptions } from './prompts.js';

// Backup utilities
export { maybeBackupFile, maybeBackupWorkflow } from './backup.js';
export type { BackupOptions } from './backup.js';
