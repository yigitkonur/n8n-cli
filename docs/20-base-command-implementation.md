# BaseCommand Implementation

## Overview

All CLI commands extend `BaseCommand`, providing universal flags, output methods, and error handling.

## MCP Source Reference

**Patterns from:** `n8n-mcp/src/mcp/tools/*.ts` - Common response patterns
**Adapt:** CLI-specific output formatting and file handling

## Class Definition

```typescript
// src/commands/base.ts
import { Command, Option, UsageError } from 'clipanion';
import { Writable } from 'stream';
import { saveJson } from '../core/formatters/json.js';
import { formatError } from '../core/formatters/errors.js';
import { getConfig, Config } from '../core/utils/config.js';
import { createSpinner, Spinner } from '../core/utils/spinner.js';
import chalk from 'chalk';

export abstract class BaseCommand extends Command {
  // ═══════════════════════════════════════════════════════════════════════════
  // UNIVERSAL FLAGS (Available on ALL commands)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save output to JSON file
   * - Saves COMPLETE data (not truncated)
   * - Includes jq recipe suggestions in confirmation
   */
  save = Option.String('-s,--save', {
    description: 'Save complete output to JSON file',
  });

  /**
   * Display limit for terminal output
   * - Default: 10 (sensible for tables)
   * - 0 = unlimited (show all)
   * - Only affects terminal display, not --save
   */
  limit = Option.Number('-l,--limit', {
    description: 'Limit displayed results (0=unlimited)',
  });

  /**
   * Verbose output mode
   * - Shows additional context
   * - Includes timing information
   * - Shows API request details
   */
  verbose = Option.Boolean('-v,--verbose', {
    description: 'Show verbose output',
  });

  /**
   * Quiet mode - minimal output
   * - Suppress decorative elements
   * - Machine-readable format
   * - Useful for scripting
   */
  quiet = Option.Boolean('-q,--quiet', {
    description: 'Minimal output (for scripting)',
  });

  /**
   * JSON output mode (alternative to --save)
   * - Prints JSON to stdout instead of Markdown
   * - Useful for piping: n8n nodes search x --json | jq ...
   */
  json = Option.Boolean('--json', {
    description: 'Output as JSON (to stdout)',
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTECTED MEMBERS
  // ═══════════════════════════════════════════════════════════════════════════

  protected config!: Config;
  protected spinner?: Spinner;
  protected startTime?: number;

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Called before execute() - load config, validate env
   */
  async validateAndExecute(): Promise<number> {
    try {
      // Load configuration
      this.config = await getConfig();
      
      // Validate conflicting flags
      if (this.verbose && this.quiet) {
        throw new UsageError('Cannot use both --verbose and --quiet');
      }

      // Track execution time
      this.startTime = Date.now();

      // Run command
      const result = await this.execute();

      // Log timing in verbose mode
      if (this.verbose) {
        const duration = Date.now() - this.startTime;
        this.log(`\n⏱️  Completed in ${duration}ms`);
      }

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Write to stdout (respects quiet mode)
   */
  protected log(message: string): void {
    if (!this.quiet) {
      this.context.stdout.write(message + '\n');
    }
  }

  /**
   * Write to stderr
   */
  protected error(message: string): void {
    this.context.stderr.write(chalk.red(message) + '\n');
  }

  /**
   * Write success message
   */
  protected success(message: string): void {
    if (!this.quiet) {
      this.context.stdout.write(chalk.green('✅ ' + message) + '\n');
    }
  }

  /**
   * Write warning message
   */
  protected warn(message: string): void {
    if (!this.quiet) {
      this.context.stdout.write(chalk.yellow('⚠️  ' + message) + '\n');
    }
  }

  /**
   * Write info message (verbose only)
   */
  protected info(message: string): void {
    if (this.verbose) {
      this.context.stdout.write(chalk.blue('ℹ️  ' + message) + '\n');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPINNER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start a loading spinner
   */
  protected startSpinner(message: string): void {
    if (!this.quiet && !this.json) {
      this.spinner = createSpinner(message);
      this.spinner.start();
    }
  }

  /**
   * Stop spinner with success
   */
  protected stopSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = undefined;
    }
  }

  /**
   * Stop spinner with failure
   */
  protected failSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = undefined;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Output data in appropriate format based on flags
   * 
   * @param data - The data to output
   * @param formatter - Function to format data as Markdown
   * @param options - Additional options
   */
  protected async output<T>(
    data: T,
    formatter: (data: T, options: FormatOptions) => string,
    options: OutputOptions = {}
  ): Promise<void> {
    const { jqRecipes = [], filename = 'output.json' } = options;

    // If --save, write ALL data to file
    if (this.save) {
      await saveJson(this.save, data);
      this.success(`Saved to ${this.save}`);
      
      // Show jq recipes
      if (jqRecipes.length > 0 && !this.quiet) {
        this.log('\n💡 jq recipes:');
        for (const recipe of jqRecipes) {
          this.log(`   ${recipe}`);
        }
      }
      return;
    }

    // If --json, output JSON to stdout
    if (this.json) {
      this.context.stdout.write(JSON.stringify(data, null, 2) + '\n');
      return;
    }

    // Otherwise, format and display Markdown
    const formatted = formatter(data, {
      limit: this.limit ?? 10,
      verbose: this.verbose ?? false,
    });
    this.context.stdout.write(formatted);

    // Show save tip if results were truncated
    if (options.showSaveTip && !this.quiet) {
      this.log(`\n💡 Tip: Use --save ${filename} for complete dataset`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle errors with consistent formatting
   */
  protected handleError(error: unknown): number {
    this.failSpinner();
    
    const formatted = formatError(error, { verbose: this.verbose ?? false });
    this.context.stderr.write(formatted + '\n');
    
    return 1;
  }

  /**
   * Validate required configuration
   */
  protected requireConfig(...keys: (keyof Config)[]): void {
    for (const key of keys) {
      if (!this.config[key]) {
        throw new ConfigurationError(`Missing required config: ${key}`);
      }
    }
  }

  /**
   * Validate required options
   */
  protected requireOption(name: string, value: unknown): asserts value {
    if (value === undefined || value === null || value === '') {
      throw new UsageError(`Missing required option: ${name}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FormatOptions {
  limit: number;
  verbose: boolean;
}

export interface OutputOptions {
  jqRecipes?: string[];
  filename?: string;
  showSaveTip?: boolean;
}
```

## Universal Flag Behavior

### --save Flag

```
# Behavior:
- Saves COMPLETE dataset (not truncated)
- Creates parent directories if needed
- Atomic write (temp file + rename)
- Shows jq recipe suggestions after save
- Exits early (no terminal output)

# Example:
n8n nodes search webhook --save nodes.json
✅ Saved 47 nodes to nodes.json

💡 jq recipes:
   jq -r '.[].nodeType' nodes.json
   jq '.[] | select(.category == "Core")' nodes.json
```

### --limit Flag

```
# Behavior:
- Default: 10
- 0 = unlimited
- Only affects terminal output
- Does NOT affect --save

# Example:
n8n workflows list --limit 5        # Show 5
n8n workflows list --limit 0        # Show all
n8n workflows list --save all.json  # Save all (ignores limit)
```

### --verbose Flag

```
# Behavior:
- Show timing information
- Show API request details
- Show additional context
- More detailed error messages

# Example:
n8n workflows list --verbose
ℹ️  API: GET https://n8n.example.com/api/v1/workflows
⏱️  Completed in 234ms
```

### --quiet Flag

```
# Behavior:
- Suppress decorative elements
- No headers/footers
- No spinners
- Machine-readable output

# Example:
n8n workflows list --quiet | wc -l   # Count workflows
```

### --json Flag

```
# Behavior:
- Output JSON to stdout (not file)
- Useful for piping
- Alternative to --save for stdout

# Example:
n8n nodes search webhook --json | jq '.[0]'
```

## Default Values

| Flag | Default | Notes |
|------|---------|-------|
| `--save` | `undefined` | No file save |
| `--limit` | `10` | Sensible display limit |
| `--verbose` | `false` | Normal output |
| `--quiet` | `false` | Normal output |
| `--json` | `false` | Markdown output |

## Error Handling Pattern

```typescript
// In derived commands:
async execute(): Promise<number> {
  try {
    // Command-specific logic
    const results = await this.doSomething();
    await this.output(results, formatResults, { jqRecipes: [...] });
    return 0;
  } catch (error) {
    // BaseCommand.handleError is called automatically
    throw error;
  }
}
```

## Files to Create

1. `src/commands/base.ts` - BaseCommand class
2. `src/core/utils/spinner.ts` - Spinner utility
3. `src/types/config.ts` - Config types

## Dependencies

```json
{
  "dependencies": {
    "clipanion": "^4.0.0-rc.16",
    "chalk": "^5.3.0",
    "ora": "^8.0.1"
  }
}
```

## Command Registration Pattern

```typescript
// src/cli.ts
import { Cli } from 'clipanion';
import { NodesSearchCommand } from './commands/nodes/SearchCommand.js';
import { NodesGetCommand } from './commands/nodes/GetCommand.js';
// ... more imports

const cli = new Cli({
  binaryLabel: 'n8n',
  binaryName: 'n8n',
  binaryVersion: '1.0.0',
});

// Register all commands
cli.register(NodesSearchCommand);
cli.register(NodesGetCommand);
// ... more registrations

// Run CLI
cli.runExit(process.argv.slice(2));
```
