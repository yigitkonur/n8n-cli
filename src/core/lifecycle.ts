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

// Force exit timeout (5 seconds)
const CLEANUP_TIMEOUT_MS = 5000;

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
    closeDatabase();
    debug('lifecycle', 'Database closed');
    
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
    performCleanup(signal).finally(() => {
      // Explicit exit after cleanup - don't rely on event loop drain
      process.exit(0);
    });
  };
}

/**
 * Register shutdown signal handlers
 * Call this early in CLI initialization
 */
export function registerShutdownHandlers(): void {
  // SIGINT: Ctrl+C
  process.on('SIGINT', createSignalHandler('SIGINT'));
  
  // SIGTERM: Docker/Kubernetes termination
  process.on('SIGTERM', createSignalHandler('SIGTERM'));
  
  // beforeExit: Fallback for clean exit (only fires when event loop is empty)
  process.on('beforeExit', () => {
    if (!cleanupComplete) {
      debug('lifecycle', 'beforeExit - performing cleanup');
      // Synchronous close since we're exiting
      closeDatabase();
    }
  });
  
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
