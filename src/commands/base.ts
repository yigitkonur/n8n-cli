import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Format options passed to all formatters
 */
export interface FormatOptions {
  json: boolean;
  quiet: boolean;
  verbose: boolean;
  limit: number;
  save?: string;
}

/**
 * Base options shared by all commands
 */
export interface BaseOptions {
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  limit?: number;
  save?: string;
}

/**
 * Add common options to a command
 */
export function addBaseOptions(cmd: Command): Command {
  return cmd
    .option('--json', 'Output as JSON (machine-readable)', false)
    .option('-q, --quiet', 'Minimal output', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('-l, --limit <n>', 'Limit displayed rows', '10')
    .option('-s, --save <path>', 'Save full output to JSON file');
}

/**
 * Parse base options into FormatOptions
 */
export function parseFormatOptions(opts: BaseOptions): FormatOptions {
  return {
    json: opts.json ?? false,
    quiet: opts.quiet ?? false,
    verbose: opts.verbose ?? false,
    limit: typeof opts.limit === 'string' ? parseInt(opts.limit, 10) : (opts.limit ?? 10),
    save: opts.save,
  };
}

/**
 * Output result to console or file
 */
export async function outputResult<T>(
  data: T,
  formatted: string,
  options: FormatOptions
): Promise<void> {
  // Save to file if requested
  if (options.save) {
    const outPath = resolve(process.cwd(), options.save);
    await writeFile(outPath, JSON.stringify(data, null, 2), 'utf8');
    if (!options.quiet) {
      console.log(`\n✅ Saved to ${outPath}`);
    }
  }

  // Output to console
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (!options.quiet || !options.save) {
    console.log(formatted);
  }
}

/**
 * Handle command errors consistently
 */
export function handleError(error: unknown, options: FormatOptions): never {
  const message = error instanceof Error ? error.message : String(error);
  
  if (options.json) {
    console.error(JSON.stringify({ error: true, message }, null, 2));
  } else {
    console.error(`\n❌ Error: ${message}`);
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
  
  process.exit(1);
}
