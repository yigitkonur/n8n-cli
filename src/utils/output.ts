import type { ValidationSummary } from '../core/types.js';

export function outputSummary(summary: ValidationSummary, jsonOutput: boolean): void {
  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const prefix = summary.valid ? '✅ VALID' : '❌ INVALID';
  console.log(`${prefix}: ${summary.input}`);

  if (summary.fixed && summary.fixed > 0) {
    console.log(`  🔧 Fixed ${summary.fixed} issue(s)`);
  }

  if (summary.errors.length) {
    console.log('  Errors:');
    for (const err of summary.errors) {
      console.log(`    - ${err}`);
    }
  }

  if (summary.warnings.length) {
    console.log('  Warnings:');
    for (const warn of summary.warnings) {
      console.log(`    - ${warn}`);
    }
  }
}
