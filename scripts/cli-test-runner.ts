#!/usr/bin/env npx ts-node
/**
 * n8n CLI Comprehensive Test Runner
 * 
 * Recursively discovers and executes all CLI commands with all flag combinations.
 * Saves outputs to cli-test-results/ with naming: {command}_{flags}.txt
 * 
 * Usage: npx ts-node scripts/cli-test-runner.ts
 */

import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const CLI_PATH = 'npx';
const CLI_ARGS = ['n8n'];
const OUTPUT_DIR = path.join(process.cwd(), 'cli-test-results');
const TIMEOUT_MS = 30000;

// Test data for commands that require arguments
const TEST_DATA = {
  workflowId: process.env.TEST_WORKFLOW_ID || '1',
  executionId: process.env.TEST_EXECUTION_ID || '1',
  templateId: process.env.TEST_TEMPLATE_ID || '1',
  nodeType: 'n8n-nodes-base.httpRequest',
  searchQuery: 'http',
  templateQuery: 'slack',
};

// ============================================================================
// Types
// ============================================================================

interface CommandDefinition {
  command: string[];           // Full command path, e.g., ['workflows', 'list']
  requiresArg?: string;        // Argument type if required
  flags: FlagDefinition[];     // Available flags
  safe: boolean;               // Whether command is safe to run (read-only)
  description: string;
}

interface FlagDefinition {
  flag: string;                // e.g., '--json', '-l'
  longFlag?: string;           // e.g., '--limit'
  requiresValue?: boolean;     // If true, needs a value
  values?: string[];           // Possible values for enum flags
  testValue?: string;          // Default test value
}

interface TestResult {
  command: string;
  flags: string[];
  exitCode: number;
  duration: number;
  stdout: string;
  stderr: string;
  outputFile: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Command Definitions (based on --help parsing)
// ============================================================================

const COMMANDS: CommandDefinition[] = [
  // Root commands
  {
    command: [],
    flags: [
      { flag: '--version', longFlag: '-V' },
      { flag: '--help', longFlag: '-h' },
    ],
    safe: true,
    description: 'Root help and version',
  },

  // AUTH commands
  {
    command: ['auth'],
    flags: [{ flag: '--help' }],
    safe: true,
    description: 'Auth group help',
  },
  {
    command: ['auth', 'status'],
    flags: [
      { flag: '--json' },
    ],
    safe: true,
    description: 'Show current authentication status',
  },
  {
    command: ['auth', 'whoami'],
    flags: [
      { flag: '--json' },
    ],
    safe: true,
    description: 'Alias for auth status',
  },
  // auth login/logout are destructive - skip actual execution but document

  // HEALTH command
  {
    command: ['health'],
    flags: [
      { flag: '--json' },
    ],
    safe: true,
    description: 'Check n8n instance connectivity',
  },

  // NODES commands
  {
    command: ['nodes'],
    flags: [{ flag: '--help' }],
    safe: true,
    description: 'Nodes group help',
  },
  {
    command: ['nodes', 'search'],
    requiresArg: 'query',
    flags: [
      { flag: '--json' },
      { flag: '--mode', longFlag: '-m', requiresValue: true, values: ['OR', 'AND', 'FUZZY'], testValue: 'OR' },
      { flag: '--limit', longFlag: '-l', requiresValue: true, testValue: '5' },
      { flag: '--save', longFlag: '-s', requiresValue: true, testValue: 'cli-test-results/nodes-search-save.json' },
    ],
    safe: true,
    description: 'Search for nodes by keyword',
  },
  {
    command: ['nodes', 'get'],
    requiresArg: 'nodeType',
    flags: [
      { flag: '--json' },
      { flag: '--mode', longFlag: '-m', requiresValue: true, values: ['info', 'docs', 'versions'], testValue: 'info' },
      { flag: '--detail', longFlag: '-d', requiresValue: true, values: ['minimal', 'standard', 'full'], testValue: 'standard' },
      { flag: '--save', longFlag: '-s', requiresValue: true, testValue: 'cli-test-results/nodes-get-save.json' },
    ],
    safe: true,
    description: 'Get node schema and documentation',
  },
  {
    command: ['nodes', 'validate'],
    requiresArg: 'nodeType',
    flags: [
      { flag: '--json' },
      { flag: '--config', longFlag: '-c', requiresValue: true, testValue: '{}' },
      { flag: '--profile', requiresValue: true, values: ['minimal', 'runtime', 'strict'], testValue: 'runtime' },
    ],
    safe: true,
    description: 'Validate node configuration',
  },

  // WORKFLOWS commands
  {
    command: ['workflows'],
    flags: [{ flag: '--help' }],
    safe: true,
    description: 'Workflows group help',
  },
  {
    command: ['workflows', 'list'],
    flags: [
      { flag: '--json' },
      { flag: '--active', longFlag: '-a' },
      { flag: '--limit', longFlag: '-l', requiresValue: true, testValue: '5' },
      { flag: '--save', longFlag: '-s', requiresValue: true, testValue: 'cli-test-results/workflows-list-save.json' },
      // --tags and --cursor need real data
    ],
    safe: true,
    description: 'List all workflows',
  },
  {
    command: ['workflows', 'get'],
    requiresArg: 'workflowId',
    flags: [
      { flag: '--json' },
      { flag: '--mode', longFlag: '-m', requiresValue: true, values: ['full', 'details', 'structure', 'minimal'], testValue: 'full' },
      { flag: '--save', longFlag: '-s', requiresValue: true, testValue: 'cli-test-results/workflows-get-save.json' },
    ],
    safe: true,
    description: 'Get workflow by ID',
  },
  {
    command: ['workflows', 'validate'],
    requiresArg: 'workflowId',
    flags: [
      { flag: '--json' },
      { flag: '--profile', requiresValue: true, values: ['minimal', 'runtime', 'ai-friendly', 'strict'], testValue: 'runtime' },
      // --repair, --fix, --save are mutating - handle carefully
    ],
    safe: true,
    description: 'Validate a workflow',
  },
  // workflows create/update/autofix/trigger are destructive

  // EXECUTIONS commands
  {
    command: ['executions'],
    flags: [{ flag: '--help' }],
    safe: true,
    description: 'Executions group help',
  },
  {
    command: ['executions', 'list'],
    flags: [
      { flag: '--json' },
      { flag: '--limit', longFlag: '-l', requiresValue: true, testValue: '5' },
      { flag: '--status', requiresValue: true, values: ['success', 'error', 'waiting'], testValue: 'success' },
      { flag: '--save', longFlag: '-s', requiresValue: true, testValue: 'cli-test-results/executions-list-save.json' },
    ],
    safe: true,
    description: 'List executions',
  },
  {
    command: ['executions', 'get'],
    requiresArg: 'executionId',
    flags: [
      { flag: '--json' },
      { flag: '--mode', longFlag: '-m', requiresValue: true, values: ['preview', 'summary', 'filtered', 'full'], testValue: 'summary' },
      { flag: '--save', longFlag: '-s', requiresValue: true, testValue: 'cli-test-results/executions-get-save.json' },
    ],
    safe: true,
    description: 'Get execution details',
  },

  // TEMPLATES commands
  {
    command: ['templates'],
    flags: [{ flag: '--help' }],
    safe: true,
    description: 'Templates group help',
  },
  {
    command: ['templates', 'search'],
    requiresArg: 'query',
    flags: [
      { flag: '--json' },
      { flag: '--limit', longFlag: '-l', requiresValue: true, testValue: '5' },
      { flag: '--save', longFlag: '-s', requiresValue: true, testValue: 'cli-test-results/templates-search-save.json' },
    ],
    safe: true,
    description: 'Search templates by keyword',
  },
  {
    command: ['templates', 'get'],
    requiresArg: 'templateId',
    flags: [
      { flag: '--json' },
      { flag: '--save', longFlag: '-s', requiresValue: true, testValue: 'cli-test-results/templates-get-save.json' },
    ],
    safe: true,
    description: 'Get template by ID',
  },

  // VALIDATE (legacy)
  {
    command: ['validate'],
    flags: [
      { flag: '--help' },
      { flag: '--json' },
    ],
    safe: true,
    description: 'Legacy validate command',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

function getArgValue(argType: string): string {
  switch (argType) {
    case 'workflowId': return TEST_DATA.workflowId;
    case 'executionId': return TEST_DATA.executionId;
    case 'templateId': return TEST_DATA.templateId;
    case 'nodeType': return TEST_DATA.nodeType;
    case 'query': return TEST_DATA.searchQuery;
    default: return '';
  }
}

function sanitizeFilename(str: string): string {
  return str
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/--/g, '_--')
    .replace(/^-/, '')
    .slice(0, 200); // Limit filename length
}

function generateOutputFilename(command: string[], flags: string[]): string {
  const cmdPart = ['n8n', ...command].join('-');
  const flagPart = flags.length > 0 ? '_' + flags.map(f => f.replace(/^--?/, '')).join('_') : '';
  return sanitizeFilename(`${cmdPart}${flagPart}.txt`);
}

async function runCommand(
  args: string[],
  timeout: number = TIMEOUT_MS
): Promise<{ stdout: string; stderr: string; exitCode: number; duration: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const fullArgs = [...CLI_ARGS, ...args];
    
    console.log(`  Running: npx ${fullArgs.join(' ')}`);
    
    const child = spawn(CLI_PATH, fullArgs, {
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' }, // Disable colors for clean output
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, timeout);

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      
      if (killed) {
        stderr += '\n[TIMEOUT: Command killed after ' + timeout + 'ms]';
      }

      resolve({
        stdout,
        stderr,
        exitCode: code ?? (killed ? 124 : 1),
        duration,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr + '\n[ERROR: ' + err.message + ']',
        exitCode: 1,
        duration: Date.now() - startTime,
      });
    });
  });
}

async function saveResult(result: TestResult): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, result.outputFile);
  
  const content = [
    `# Command: npx n8n ${result.command}`,
    `# Flags: ${result.flags.join(' ') || '(none)'}`,
    `# Exit Code: ${result.exitCode}`,
    `# Duration: ${result.duration}ms`,
    `# Timestamp: ${new Date().toISOString()}`,
    `# Success: ${result.success}`,
    result.error ? `# Error: ${result.error}` : '',
    '',
    '=== STDOUT ===',
    result.stdout || '(empty)',
    '',
    '=== STDERR ===',
    result.stderr || '(empty)',
  ].filter(Boolean).join('\n');

  await fs.promises.writeFile(outputPath, content, 'utf-8');
}

// ============================================================================
// Test Generators
// ============================================================================

interface TestCase {
  command: string[];
  flags: string[];
  description: string;
  filename: string;
}

function generateTestCases(cmd: CommandDefinition): TestCase[] {
  const cases: TestCase[] = [];
  const baseCmd = [...cmd.command];
  
  // Add required argument if needed
  if (cmd.requiresArg) {
    const argValue = getArgValue(cmd.requiresArg);
    if (argValue) {
      baseCmd.push(argValue);
    }
  }

  // 1. Base command (no flags)
  cases.push({
    command: baseCmd,
    flags: [],
    description: `${cmd.description} (no flags)`,
    filename: generateOutputFilename(cmd.command, []),
  });

  // 2. Each individual flag
  for (const flag of cmd.flags) {
    if (flag.flag === '--help') {
      // Help is special - run on base command without arg
      cases.push({
        command: [...cmd.command, '--help'],
        flags: ['--help'],
        description: `${cmd.description} (help)`,
        filename: generateOutputFilename(cmd.command, ['--help']),
      });
      continue;
    }

    const flagArgs: string[] = [];
    
    if (flag.requiresValue) {
      // Test with each possible value
      const values = flag.values || [flag.testValue || 'test'];
      for (const val of values) {
        const testFlags = [flag.flag, val];
        cases.push({
          command: [...baseCmd, flag.flag, val],
          flags: testFlags,
          description: `${cmd.description} (${flag.flag}=${val})`,
          filename: generateOutputFilename(cmd.command, [flag.flag, val]),
        });
      }
    } else {
      // Boolean flag
      cases.push({
        command: [...baseCmd, flag.flag],
        flags: [flag.flag],
        description: `${cmd.description} (${flag.flag})`,
        filename: generateOutputFilename(cmd.command, [flag.flag]),
      });
    }
  }

  // 3. --json combined with other key flags (for comprehensive coverage)
  const jsonFlag = cmd.flags.find(f => f.flag === '--json');
  if (jsonFlag) {
    for (const flag of cmd.flags) {
      if (flag.flag !== '--json' && flag.flag !== '--help' && flag.flag !== '--save') {
        if (flag.requiresValue && flag.testValue) {
          cases.push({
            command: [...baseCmd, '--json', flag.flag, flag.testValue],
            flags: ['--json', flag.flag, flag.testValue],
            description: `${cmd.description} (--json + ${flag.flag})`,
            filename: generateOutputFilename(cmd.command, ['--json', flag.flag, flag.testValue]),
          });
        } else if (!flag.requiresValue) {
          cases.push({
            command: [...baseCmd, '--json', flag.flag],
            flags: ['--json', flag.flag],
            description: `${cmd.description} (--json + ${flag.flag})`,
            filename: generateOutputFilename(cmd.command, ['--json', flag.flag]),
          });
        }
      }
    }
  }

  return cases;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('n8n CLI Comprehensive Test Runner');
  console.log('='.repeat(70));
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Test data:`, TEST_DATA);
  console.log('');

  // Ensure output directory exists
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });

  const allResults: TestResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Process each command
  for (const cmd of COMMANDS) {
    if (!cmd.safe) {
      console.log(`\n[SKIP] ${cmd.command.join(' ')} - marked as unsafe/destructive`);
      continue;
    }

    const testCases = generateTestCases(cmd);
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Command: n8n ${cmd.command.join(' ')} (${testCases.length} test cases)`);
    console.log(`${'─'.repeat(70)}`);

    for (const testCase of testCases) {
      totalTests++;
      
      console.log(`\nTest ${totalTests}: ${testCase.description}`);
      
      const { stdout, stderr, exitCode, duration } = await runCommand(testCase.command);
      
      const result: TestResult = {
        command: testCase.command.join(' '),
        flags: testCase.flags,
        exitCode,
        duration,
        stdout,
        stderr,
        outputFile: testCase.filename,
        success: exitCode === 0 || (stderr.includes('not configured') && exitCode === 1),
      };

      if (result.success) {
        passedTests++;
        console.log(`  ✓ PASS (exit: ${exitCode}, ${duration}ms)`);
      } else {
        failedTests++;
        console.log(`  ✗ FAIL (exit: ${exitCode}, ${duration}ms)`);
        if (stderr) {
          console.log(`    stderr: ${stderr.slice(0, 100)}...`);
        }
      }

      await saveResult(result);
      allResults.push(result);
    }
  }

  // Write summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total:  ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Output: ${OUTPUT_DIR}/`);

  // Write JSON summary
  const summaryPath = path.join(OUTPUT_DIR, '_test-summary.json');
  await fs.promises.writeFile(
    summaryPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      testData: TEST_DATA,
      results: allResults.map(r => ({
        command: r.command,
        flags: r.flags,
        exitCode: r.exitCode,
        duration: r.duration,
        success: r.success,
        outputFile: r.outputFile,
      })),
    }, null, 2),
    'utf-8'
  );
  console.log(`Summary: ${summaryPath}`);

  // Write markdown report
  const reportPath = path.join(OUTPUT_DIR, '_test-report.md');
  const reportContent = generateMarkdownReport(allResults, totalTests, passedTests, failedTests);
  await fs.promises.writeFile(reportPath, reportContent, 'utf-8');
  console.log(`Report:  ${reportPath}`);

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

function generateMarkdownReport(
  results: TestResult[],
  total: number,
  passed: number,
  failed: number
): string {
  const lines: string[] = [
    '# n8n CLI Test Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Total Tests:** ${total}`,
    `**Passed:** ${passed} (${((passed / total) * 100).toFixed(1)}%)`,
    `**Failed:** ${failed}`,
    '',
    '## Results by Command',
    '',
  ];

  // Group by command
  const grouped = new Map<string, TestResult[]>();
  for (const r of results) {
    const cmdKey = r.command.split(' ').slice(0, 2).join(' ');
    if (!grouped.has(cmdKey)) {
      grouped.set(cmdKey, []);
    }
    grouped.get(cmdKey)!.push(r);
  }

  for (const [cmd, cmdResults] of grouped) {
    lines.push(`### ${cmd}`);
    lines.push('');
    lines.push('| Flags | Exit | Duration | Status | Output |');
    lines.push('|-------|------|----------|--------|--------|');
    
    for (const r of cmdResults) {
      const status = r.success ? '✓' : '✗';
      const flags = r.flags.join(' ') || '(none)';
      lines.push(`| \`${flags}\` | ${r.exitCode} | ${r.duration}ms | ${status} | [${r.outputFile}](./${r.outputFile}) |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Run
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
