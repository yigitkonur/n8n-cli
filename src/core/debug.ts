/**
 * Debug Logging Utility
 * Task 07: Debug Logging for Silent Failures
 * 
 * Only outputs when N8N_DEBUG=true
 * Uses console.warn to avoid polluting stdout
 */

/**
 * Log debug message if debug mode is enabled
 * @param category - Category for the log message (e.g., 'loader', 'lifecycle')
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function debug(category: string, message: string, ...args: unknown[]): void {
  if (process.env.N8N_DEBUG === 'true') {
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
    const prefix = `[DEBUG:${category}]`;
    
    if (args.length > 0) {
      console.warn(`${timestamp} ${prefix} ${message}`, ...args);
    } else {
      console.warn(`${timestamp} ${prefix} ${message}`);
    }
  }
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return process.env.N8N_DEBUG === 'true';
}
