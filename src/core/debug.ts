/**
 * Debug Logging Utility
 * Only outputs when N8N_DEBUG=true
 * Uses console.warn to avoid polluting stdout
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
