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
  sanitizeForLogging,
} from './errors.js';

// Node type normalization
export {
  NodeTypeNormalizer,
} from './node-type-normalizer.js';
export type { NodeTypeNormalizationResult } from './node-type-normalizer.js';

// Interactive prompts (Task 02)
export {
  confirmAction,
  displayChangeSummary,
  isInteractive,
} from './prompts.js';
export type { ConfirmOptions } from './prompts.js';

// Backup utilities (Task 03)
export {
  createFileBackup,
  saveWorkflowBackup,
  maybeBackupFile,
  maybeBackupWorkflow,
  logBackupCreated,
  BACKUP_DIR,
} from './backup.js';
export type { BackupOptions } from './backup.js';
