import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';

/**
 * Options for JSON file output
 */
export interface JsonOutputOptions {
  /** Path to save file */
  path: string;
  /** Pretty print with indentation */
  pretty?: boolean;
  /** Show confirmation message */
  silent?: boolean;
}

/**
 * Save data to JSON file with confirmation
 */
export async function saveToJson<T>(
  data: T,
  options: JsonOutputOptions
): Promise<{ path: string; size: number }> {
  const { path: filePath, pretty = true, silent = false } = options;
  
  const resolvedPath = resolve(process.cwd(), filePath);
  const content = pretty 
    ? JSON.stringify(data, null, 2) 
    : JSON.stringify(data);
  
  await writeFile(resolvedPath, content, 'utf8');
  
  const size = Buffer.byteLength(content, 'utf8');
  
  if (!silent) {
    console.log(chalk.green(`✅ Saved to ${resolvedPath} (${formatBytes(size)})`));
  }
  
  return { path: resolvedPath, size };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Output data as JSON to stdout
 */
export function outputJson<T>(data: T, pretty = true): void {
  const content = pretty 
    ? JSON.stringify(data, null, 2) 
    : JSON.stringify(data);
  console.log(content);
}

/**
 * Format JSON response for CLI
 */
export function formatJsonResponse<T>(
  data: T,
  meta?: { total?: number; displayed?: number; hasMore?: boolean }
): string {
  const response = meta 
    ? { data, meta }
    : data;
  return JSON.stringify(response, null, 2);
}
