/**
 * Process Lifecycle Management
 * Handles graceful shutdown, signal handling, and cleanup
 * Task 01: Unified Process Lifecycle Management
 */

import { closeDatabase } from './db/adapter.js';
import { debug } from './debug.js';

// Cleanup state tracking
let isCleaningUp = false;
let cleanupComplete = false;

/**
 * Cleanup timeout in milliseconds.
 * Configurable via N8N_CLEANUP_TIMEOUT_MS environment variable.
 * Default: 5000ms (5 seconds)
 */
const CLEANUP_TIMEOUT_MS = (() => {
  const envValue = parseInt(process.env.N8N_CLEANUP_TIMEOUT_MS || '5000', 10);
  return isNaN(envValue) || envValue < 0 ? 5000 : envValue;
})();

/**
 * Perform cleanup operations
 */
async function performCleanup(signal?: string): Promise<void> {
  if (isCleaningUp) {
    debug('lifecycle', 'Cleanup already in progress, skipping');
    return;
  }
  
  isCleaningUp = true;
  debug('lifecycle', `Starting cleanup${signal ? ` (signal: ${signal})` : ''}`);
  
  // Set timeout to force exit if cleanup hangs
  const forceExitTimeout = setTimeout(() => {
    console.error('\nCleanup timeout - forcing exit');
    process.exit(1);
  }, CLEANUP_TIMEOUT_MS);
  
  try {
    // Close database connection
    debug('lifecycle', 'Closing database connection');
    try {
      closeDatabase();
      debug('lifecycle', 'Database closed');
    } catch (dbError) {
      debug('lifecycle', `closeDatabase error (ignored): ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }
    
    cleanupComplete = true;
    debug('lifecycle', 'Cleanup complete');
  } catch (error) {
    debug('lifecycle', `Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
    // Don't throw - we want to exit cleanly even if cleanup fails
  } finally {
    clearTimeout(forceExitTimeout);
  }
}

/**
 * Signal handler for SIGINT/SIGTERM
 */
function createSignalHandler(signal: string): () => void {
  return () => {
    debug('lifecycle', `Received ${signal}`);
    // Use process.exitCode instead of process.exit() to allow event loop drain
    // This ensures in-flight operations complete gracefully
    // Timeout in performCleanup() acts as safety net for hung cleanup
    process.exitCode = signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 0;
    performCleanup(signal);
  };
}

/**
 * Register shutdown signal handlers
 * Call this early in CLI initialization
 */
export function registerShutdownHandlers(): void {
  // SIGPIPE: Ignore broken pipe (common in piped commands like `n8n list | head`)
  process.on('SIGPIPE', () => {
    debug('lifecycle', 'Ignoring SIGPIPE (broken pipe)');
  });
  
  // SIGINT: Ctrl+C
  process.on('SIGINT', createSignalHandler('SIGINT'));
  
  // SIGTERM: Docker/Kubernetes termination
  process.on('SIGTERM', createSignalHandler('SIGTERM'));
  
  // SIGHUP: Terminal disconnect (SSH timeout)
  process.on('SIGHUP', createSignalHandler('SIGHUP'));
  
  // uncaughtException: Sync-only, fatal error
  process.on('uncaughtException', (err) => {
    debug('lifecycle', `Uncaught exception: ${err.message}`);
    console.error(`\nFatal error: ${err.message}`);
    // Sync cleanup only - async won't complete
    closeDatabase();
    process.exit(1);
  });
  
  // unhandledRejection: Async cleanup allowed
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    debug('lifecycle', `Unhandled rejection: ${message}`);
    console.error(`\nUnhandled promise rejection: ${message}`);
    performCleanup('unhandledRejection').finally(() => {
      process.exit(1);
    });
  });
  
  debug('lifecycle', 'Shutdown handlers registered');
}

/**
 * Manual cleanup function
 * Call this in try/finally blocks
 */
export async function shutdown(): Promise<void> {
  await performCleanup();
}
