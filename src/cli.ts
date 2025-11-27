#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { jsonParse } from './core/json-parser.js';
import { validateWorkflowStructure } from './core/validator.js';
import { fixInvalidOptionsFields } from './core/fixer.js';
import { sanitizeWorkflow } from './core/sanitizer.js';
import { classifyInput, readInput } from './utils/input-reader.js';
import { outputSummary } from './utils/output.js';
import type { Workflow, ValidationSummary } from './core/types.js';

interface CliOptions {
  repairJSON: boolean;
  acceptJSObject: boolean;
  sanitize: boolean;
  regenerateIds: boolean;
  jsonOutput: boolean;
  outputFile?: string;
  fix: boolean;
}

function parseArgs(argv: string[]): { input?: string; options: CliOptions } {
  const args = argv.slice(2);
  const options: CliOptions = {
    repairJSON: false,
    acceptJSObject: false,
    sanitize: true,
    regenerateIds: true,
    jsonOutput: false,
    outputFile: undefined,
    fix: false,
  };

  let input: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--repair':
        options.repairJSON = true;
        break;
      case '--accept-js-object':
        options.acceptJSObject = true;
        break;
      case '--no-sanitize':
        options.sanitize = false;
        break;
      case '--no-regenerate-ids':
        options.regenerateIds = false;
        break;
      case '--json':
        options.jsonOutput = true;
        break;
      case '--fix':
        options.fix = true;
        break;
      case '--out':
      case '--output':
        options.outputFile = args[i + 1];
        i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        if (!input && !arg.startsWith('-')) {
          input = arg;
        }
        break;
    }
  }

  return { input, options };
}

function printHelp(): void {
  console.log(`
n8n Workflow JSON Validator

Usage:
  n8n-validate <file-or-url> [options]

Options:
  --repair             Attempt to repair malformed JSON
  --accept-js-object   Accept JavaScript object literal syntax
  --fix                Auto-fix known issues (invalid options fields)
  --no-sanitize        Disable workflow sanitization
  --no-regenerate-ids  Do not regenerate node IDs
  --json               Output result as JSON
  --out, --output FILE Write fixed workflow to FILE
  -h, --help           Show this help

Examples:
  n8n-validate workflow.json
  n8n-validate workflow.json --fix --out fixed.json
  n8n-validate "https://example.com/workflow.json" --json
  cat workflow.json | n8n-validate --json
`);
}

async function main(): Promise<void> {
  const { input, options } = parseArgs(process.argv);
  const sourceType = classifyInput(input);
  const label = input ?? '<stdin>';

  let raw: string;
  try {
    raw = await readInput(input, sourceType);
  } catch (error: any) {
    const summary: ValidationSummary = {
      input: label,
      sourceType,
      valid: false,
      errors: [`Failed to read input: ${error?.message ?? String(error)}`],
      warnings: [],
      sanitized: false,
    };
    outputSummary(summary, options.jsonOutput);
    process.exit(1);
  }

  const parsed = jsonParse<Workflow | null>(raw.trim(), {
    acceptJSObject: options.acceptJSObject,
    repairJSON: options.repairJSON,
    fallbackValue: null,
  });

  if (!parsed) {
    const summary: ValidationSummary = {
      input: label,
      sourceType,
      valid: false,
      errors: ['Could not parse workflow JSON'],
      warnings: [],
      sanitized: false,
    };
    outputSummary(summary, options.jsonOutput);
    process.exit(1);
  }

  let fixedCount = 0;
  const allWarnings: string[] = [];

  if (options.fix) {
    const fixResult = fixInvalidOptionsFields(parsed);
    fixedCount = fixResult.fixed;
    allWarnings.push(...fixResult.warnings);
  }

  const structure = validateWorkflowStructure(parsed);
  const allErrors = [...structure.errors];
  allWarnings.push(...structure.warnings);

  if (structure.nodeTypeIssues) {
    allErrors.push(...structure.nodeTypeIssues);
  }

  let workflowOut = parsed;

  if (structure.valid && options.sanitize) {
    const sanitized = sanitizeWorkflow(parsed, { regenerateIds: options.regenerateIds });
    workflowOut = sanitized.workflow;
    allWarnings.push(...sanitized.warnings);
  }

  const summary: ValidationSummary = {
    input: label,
    sourceType,
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    sanitized: structure.valid && options.sanitize,
    fixed: fixedCount > 0 ? fixedCount : undefined,
  };

  if (options.outputFile && allErrors.length === 0) {
    const outPath = resolve(process.cwd(), options.outputFile);
    await writeFile(outPath, JSON.stringify(workflowOut, null, 2), 'utf8');
  }

  outputSummary(summary, options.jsonOutput);
  process.exit(summary.valid ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
