// Exit codes
export {
  ExitCode,
  getExitCode,
  setExitCode,
  exitWithCode,
  getExitCodeDescription,
} from './exit-codes.js';

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
export type { PrintErrorOptions } from './errors.js';

// Node type normalization
export { NodeTypeNormalizer } from './node-type-normalizer.js';
export type { NodeTypeNormalizationResult } from './node-type-normalizer.js';

// Interactive prompts
export { confirmAction, displayChangeSummary } from './prompts.js';
export type { ConfirmOptions } from './prompts.js';

// Backup utilities
export { maybeBackupFile, maybeBackupWorkflow } from './backup.js';
export type { BackupOptions } from './backup.js';

// Output context utilities
export {
  createOutputContext,
  shouldUseColor,
  isVerbose,
  isQuiet,
  disableColors,
  getTerminalWidth,
  isTTY,
} from './output.js';
export type { OutputContext } from './output.js';

// Spinner utilities
export {
  createSpinner,
  startSpinner,
  withSpinner,
  withProgressSpinner,
  spinner,
} from './spinner.js';
export type { SpinnerOptions, SpinnerResult } from './spinner.js';
