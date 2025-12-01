# P2: Post-Update Validator

## Priority: P2 (Medium)
## Status: Not Implemented in CLI
## MCP Source: `n8n-mcp/src/services/post-update-validator.ts`

---

## Business Value

**User Impact:** After CLI autofix operations upgrade node versions, users are left wondering "what did it actually change?" and "what do I need to verify?" The Post-Update Validator generates AI-friendly, actionable migration guidance that tells users exactly what was modified, what manual steps remain, and how to verify the fixes worked correctly.

**Workflow Improvement:** Instead of blindly trusting autofix results, users get:
- Confidence scores for each upgrade (HIGH/MEDIUM/LOW)
- Step-by-step verification checklists
- Estimated time to complete manual tasks
- Clear documentation of behavior changes between versions

**Time Saved:** Reduces debugging time from hours to minutes by providing proactive guidance rather than reactive troubleshooting. Prevents production issues by surfacing required manual actions before deployment.

---

## Current CLI Status

- **Implemented:** No
- **Location:** N/A
- **Gap Reason:** Multiple blocking dependencies not yet ported to CLI

### Why Not Yet Implemented

1. **Missing Node Version Service (P1 Blocker)**
   - Planning doc: `08-P1-node-version-service.md`
   - CLI has no `NodeVersionService` equivalent
   - MCP location: `n8n-mcp/src/services/node-version-service.ts` (378 lines)
   - Required for: `compareVersions()`, `getLatestVersion()`, `analyzeVersion()`

2. **Missing Breaking Change Detector (P1 Blocker)**
   - Planning doc: `09-P1-breaking-change-detector.md`
   - CLI has no `BreakingChangeDetector` equivalent
   - MCP location: `n8n-mcp/src/services/breaking-change-detector.ts` (322 lines)
   - Required for: `analyzeVersionUpgrade()`, detecting what changed between versions

3. **Basic Fixer Architecture**
   - Current CLI `src/core/fixer.ts` (220 lines) only handles:
     - Empty options on If/Switch nodes
     - Switch v3 rule conditions
     - Switch v3 fallback output location
   - No version migration infrastructure
   - No integration with version services

4. **No Migration Result Type**
   - MCP has `MigrationResult` interface in `node-migration-service.ts`
   - CLI fixer returns simple `{ fixed: number, warnings: string[] }`

5. **Autofix Command Lacks Guidance Integration**
   - `src/commands/workflows/autofix.ts` reports fixes but no guidance
   - Lines 58-91: Only tracks fix type/count, not version migrations
   - No `postUpdateGuidance` in output structure

---

## CLI Architecture Overview

### Entry Point & Command Routing

The CLI uses Commander.js with a resource-action pattern: `n8n <resource> <action> [id/file] [options]`

```
src/cli.ts                          # Entry point - registers all commands
    ↓
src/commands/<resource>/index.ts    # Resource group (e.g., workflows, nodes)
    ↓
src/commands/<resource>/<action>.ts # Action handler (e.g., validate, autofix)
```

### Command Registration Pattern

```typescript
// src/cli.ts - How commands are registered
import { program } from 'commander';

// Resource groups
const workflows = program.command('workflows').description('Manage n8n workflows');
workflows.command('validate').action(workflowsValidateCommand);
workflows.command('autofix').action(workflowsAutofixCommand);  // ← Integration point
```

### Shared Modules Used by Commands

| Module | Path | Purpose |
|--------|------|---------|
| **API Client** | `src/core/api/client.ts` | HTTP calls to n8n instance |
| **Config Loader** | `src/core/config/loader.ts` | Load `.n8nrc`, env vars, profiles |
| **Validator** | `src/core/validator.ts` | Workflow structure validation |
| **Fixer** | `src/core/fixer.ts` | Auto-fix logic (to be extended) |
| **Formatters** | `src/core/formatters/` | Output formatting (table, JSON, tree) |
| **Theme** | `src/core/formatters/theme.ts` | Icons, colors |
| **Errors** | `src/utils/errors.ts` | Error classes, `printError()` |
| **Exit Codes** | `src/utils/exit-codes.ts` | POSIX exit codes |
| **Prompts** | `src/utils/prompts.ts` | Interactive confirmation |
| **Backup** | `src/utils/backup.ts` | Backup before mutations |

### Global Options (All Commands)

From `README.md`, every command supports:
- `-V, --version` — Output version
- `-v, --verbose` — Debug output  
- `-q, --quiet` — Suppress non-essential output
- `--no-color` — Disable colors
- `--profile <name>` — Use config profile
- `-h, --help` — Display help

### Standard Action Options

Commands follow consistent patterns:
- **Output:** `--json` for machine-readable, `-s, --save <path>` to file
- **Safety:** `--force, --yes` to skip prompts, `--no-backup` to skip backup
- **Pagination:** `-l, --limit <n>`, `--cursor <cursor>`

---

## CLI Commands Reference

### Affected Command: `workflows autofix`

This feature extends the existing `workflows autofix` command.

#### Current Syntax (from README.md)
```bash
n8n workflows autofix <idOrFile> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | Path to workflow JSON file | - |
| `--dry-run` | Preview fixes without applying | `true` |
| `--confidence <level>` | Minimum confidence: `high`, `medium`, `low` | `medium` |
| `-s, --save <path>` | Save fixed workflow locally | - |
| `--apply` | Apply fixes (to file or n8n server) | - |
| `--experimental` | Enable experimental fixes | - |
| `--force, --yes` | Skip confirmation prompts | - |
| `--no-backup` | Skip creating backup before changes | - |
| `--json` | Output as JSON | - |

#### New Options (This Feature)
```bash
n8n workflows autofix <idOrFile> --guidance [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--guidance` | Display post-update guidance | `true` |
| `--no-guidance` | Suppress guidance display | - |

#### Implementation File
```
src/commands/workflows/autofix.ts
```

### Related Commands

| Command | Syntax | Implementation | Relevance |
|---------|--------|----------------|-----------|
| `workflows validate` | `n8n workflows validate <idOrFile> [options]` | `src/commands/workflows/validate.ts` | Uses same validation, may show guidance |
| `workflows update` | `n8n workflows update <id> [options]` | `src/commands/workflows/update.ts` | Could trigger guidance after version upgrades |

---

## MCP Reference Implementation

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `n8n-mcp/src/services/post-update-validator.ts` | 424 | Core guidance generator |
| `n8n-mcp/src/services/workflow-auto-fixer.ts` | 62, 728-738 | Integration with autofix |
| `n8n-mcp/src/services/node-version-service.ts` | 378 | Version comparison/analysis |
| `n8n-mcp/src/services/breaking-change-detector.ts` | 322 | Change detection |
| `n8n-mcp/src/services/node-migration-service.ts` | 411 | Migration execution |
| `n8n-mcp/src/services/breaking-changes-registry.ts` | 316 | Known breaking changes DB |

### Key Type Definitions

```typescript
// n8n-mcp/src/services/post-update-validator.ts:18-31
export interface PostUpdateGuidance {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  oldVersion: string;
  newVersion: string;
  migrationStatus: 'complete' | 'partial' | 'manual_required';
  requiredActions: RequiredAction[];
  deprecatedProperties: DeprecatedProperty[];
  behaviorChanges: BehaviorChange[];
  migrationSteps: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTime: string;
}

// n8n-mcp/src/services/post-update-validator.ts:33-41
export interface RequiredAction {
  type: 'ADD_PROPERTY' | 'UPDATE_PROPERTY' | 'CONFIGURE_OPTION' | 'REVIEW_CONFIGURATION';
  property: string;
  reason: string;
  suggestedValue?: any;
  currentValue?: any;
  documentation?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

// n8n-mcp/src/services/post-update-validator.ts:43-49
export interface DeprecatedProperty {
  property: string;
  status: 'removed' | 'deprecated';
  replacement?: string;
  action: 'remove' | 'replace' | 'ignore';
  impact: 'breaking' | 'warning';
}

// n8n-mcp/src/services/post-update-validator.ts:51-58
export interface BehaviorChange {
  aspect: string;
  oldBehavior: string;
  newBehavior: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionRequired: boolean;
  recommendation: string;
}

// n8n-mcp/src/services/node-migration-service.ts:18-28
export interface MigrationResult {
  success: boolean;
  nodeId: string;
  nodeName: string;
  fromVersion: string;
  toVersion: string;
  appliedMigrations: AppliedMigration[];
  remainingIssues: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  updatedNode: any;
}
```

### Core Class Architecture

```typescript
// n8n-mcp/src/services/post-update-validator.ts:60-64
export class PostUpdateValidator {
  constructor(
    private versionService: NodeVersionService,
    private breakingChangeDetector: BreakingChangeDetector
  ) {}

  // Main entry point - generates comprehensive guidance
  async generateGuidance(
    nodeId: string,
    nodeName: string,
    nodeType: string,
    oldVersion: string,
    newVersion: string,
    migrationResult: MigrationResult
  ): Promise<PostUpdateGuidance>

  // Lines 130-145: Determines if migration is complete/partial/manual_required
  private determineMigrationStatus(migrationResult, changes): MigrationStatus

  // Lines 150-173: Generates actionable items for manual intervention
  private generateRequiredActions(migrationResult, changes, nodeType): RequiredAction[]

  // Lines 178-194: Lists deprecated/removed properties
  private identifyDeprecatedProperties(changes): DeprecatedProperty[]

  // Lines 199-249: Documents node-specific behavior changes
  private documentBehaviorChanges(nodeType, oldVersion, newVersion): BehaviorChange[]

  // Lines 254-316: Creates numbered step-by-step migration guide
  private generateMigrationSteps(requiredActions, deprecatedProperties, behaviorChanges): string[]

  // Lines 358-371: Calculates HIGH/MEDIUM/LOW based on remaining issues
  private calculateConfidence(requiredActions, migrationStatus): Confidence

  // Lines 376-391: Estimates "5 minutes", "10-20 minutes" etc.
  private estimateTime(requiredActions, behaviorChanges): string

  // Lines 396-422: Human-readable summary for logs
  generateSummary(guidance: PostUpdateGuidance): string
}
```

### Data Flow

```
1. WorkflowAutoFixer.generateFixes() processes workflow
   ↓
2. For each node with version upgrade:
   - NodeMigrationService.migrateNode() applies changes
   - Returns MigrationResult with applied/remaining issues
   ↓
3. PostUpdateValidator.generateGuidance() receives:
   - Node info (id, name, type)
   - Version info (old → new)
   - MigrationResult with what was auto-fixed
   ↓
4. Internally:
   - BreakingChangeDetector.analyzeVersionUpgrade() → DetectedChange[]
   - determineMigrationStatus() → 'complete' | 'partial' | 'manual_required'
   - generateRequiredActions() → RequiredAction[]
   - identifyDeprecatedProperties() → DeprecatedProperty[]
   - documentBehaviorChanges() → BehaviorChange[]
   - generateMigrationSteps() → string[]
   - calculateConfidence() → 'HIGH' | 'MEDIUM' | 'LOW'
   - estimateTime() → "5 minutes"
   ↓
5. Returns PostUpdateGuidance with complete guidance
   ↓
6. AutoFixResult includes postUpdateGuidance[] array
```

---

## CLI Integration Path

### Files to Create

| File | Purpose | Lines |
|------|---------|-------|
| `src/core/autofix/types.ts` | Shared types for guidance system | ~80 |
| `src/core/autofix/post-update-validator.ts` | Port of PostUpdateValidator class | ~250 |
| `src/core/formatters/guidance.ts` | CLI-specific formatting for terminal | ~80 |

### Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `src/core/fixer.ts` | Extend `FixResult` interface with `postUpdateGuidance` | +5 |
| `src/commands/workflows/autofix.ts` | Add `--guidance` flag, display guidance | +30 |
| `src/types/index.ts` | Export new guidance types | +3 |

### Detailed Implementation Plan

#### Step 1: Create Type Definitions
```typescript
// src/core/autofix/types.ts
// Port types from n8n-mcp/src/services/post-update-validator.ts

export interface PostUpdateGuidance {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  oldVersion: string;
  newVersion: string;
  migrationStatus: 'complete' | 'partial' | 'manual_required';
  requiredActions: RequiredAction[];
  deprecatedProperties: DeprecatedProperty[];
  behaviorChanges: BehaviorChange[];
  migrationSteps: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTime: string;
}

export interface RequiredAction {
  type: 'ADD_PROPERTY' | 'UPDATE_PROPERTY' | 'CONFIGURE_OPTION' | 'REVIEW_CONFIGURATION';
  property: string;
  reason: string;
  suggestedValue?: any;
  currentValue?: any;
  documentation?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DeprecatedProperty {
  property: string;
  status: 'removed' | 'deprecated';
  replacement?: string;
  action: 'remove' | 'replace' | 'ignore';
  impact: 'breaking' | 'warning';
}

export interface BehaviorChange {
  aspect: string;
  oldBehavior: string;
  newBehavior: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionRequired: boolean;
  recommendation: string;
}

export interface MigrationResult {
  success: boolean;
  nodeId: string;
  nodeName: string;
  fromVersion: string;
  toVersion: string;
  appliedMigrations: { propertyName: string; action: string; description: string }[];
  remainingIssues: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  updatedNode: any;
}
```

#### Step 2: Port PostUpdateValidator Class
```typescript
// src/core/autofix/post-update-validator.ts
import type { NodeVersionService } from '../version/node-version-service.js';
import type { BreakingChangeDetector } from '../version/breaking-change-detector.js';
import type { PostUpdateGuidance, MigrationResult, RequiredAction, DeprecatedProperty, BehaviorChange } from './types.js';

export class PostUpdateValidator {
  constructor(
    private versionService: NodeVersionService,
    private breakingChangeDetector: BreakingChangeDetector
  ) {}

  async generateGuidance(
    nodeId: string,
    nodeName: string,
    nodeType: string,
    oldVersion: string,
    newVersion: string,
    migrationResult: MigrationResult
  ): Promise<PostUpdateGuidance> {
    // Port logic from n8n-mcp/src/services/post-update-validator.ts:69-125
    const analysis = await this.breakingChangeDetector.analyzeVersionUpgrade(
      nodeType, oldVersion, newVersion
    );

    const migrationStatus = this.determineMigrationStatus(migrationResult, analysis.changes);
    const requiredActions = this.generateRequiredActions(migrationResult, analysis.changes, nodeType);
    const deprecatedProperties = this.identifyDeprecatedProperties(analysis.changes);
    const behaviorChanges = this.documentBehaviorChanges(nodeType, oldVersion, newVersion);
    const migrationSteps = this.generateMigrationSteps(requiredActions, deprecatedProperties, behaviorChanges);
    const confidence = this.calculateConfidence(requiredActions, migrationStatus);
    const estimatedTime = this.estimateTime(requiredActions, behaviorChanges);

    return {
      nodeId, nodeName, nodeType, oldVersion, newVersion,
      migrationStatus, requiredActions, deprecatedProperties,
      behaviorChanges, migrationSteps, confidence, estimatedTime
    };
  }

  // Port private methods from MCP lines 130-391
  // ... (see n8n-mcp/src/services/post-update-validator.ts for full implementation)
}
```

#### Step 3: Create Guidance Formatter
```typescript
// src/core/formatters/guidance.ts
// Following pattern from src/core/formatters/summary.ts and src/core/formatters/header.ts

import chalk from 'chalk';
import { icons } from './theme.js';
import type { PostUpdateGuidance } from '../autofix/types.js';

export function formatPostUpdateGuidance(guidance: PostUpdateGuidance[]): string {
  const lines: string[] = [];
  
  for (const g of guidance) {
    lines.push('');
    lines.push(chalk.cyan('╔' + '═'.repeat(60) + '╗'));
    lines.push(chalk.cyan(`║ ${icons.info} Post-Update Guidance`.padEnd(61) + '║'));
    lines.push(chalk.cyan('╠' + '═'.repeat(60) + '╣'));
    lines.push(`║ Node: ${g.nodeName} (${g.nodeId.slice(0, 8)}...)`.padEnd(61) + '║');
    lines.push(`║ Upgrade: v${g.oldVersion} → v${g.newVersion}`.padEnd(61) + '║');
    lines.push(`║ Status: ${formatStatus(g.migrationStatus)}`.padEnd(61) + '║');
    lines.push(`║ Confidence: ${formatConfidence(g.confidence)}`.padEnd(61) + '║');
    lines.push(`║ Est. Time: ${g.estimatedTime}`.padEnd(61) + '║');
    
    if (g.requiredActions.length > 0) {
      lines.push('║'.padEnd(61) + '║');
      lines.push(`║ ${icons.warning} Required Actions:`.padEnd(61) + '║');
      for (const action of g.requiredActions) {
        lines.push(`║   [${action.priority}] ${action.property}: ${action.reason}`.slice(0, 60).padEnd(61) + '║');
      }
    }
    
    if (g.behaviorChanges.length > 0) {
      lines.push('║'.padEnd(61) + '║');
      lines.push(`║ ${icons.info} Behavior Changes:`.padEnd(61) + '║');
      for (const change of g.behaviorChanges) {
        lines.push(`║   • ${change.aspect}: ${change.recommendation}`.slice(0, 60).padEnd(61) + '║');
      }
    }
    
    if (g.migrationSteps.length > 0) {
      lines.push('║'.padEnd(61) + '║');
      lines.push(`║ ${icons.success} Migration Steps:`.padEnd(61) + '║');
      for (const step of g.migrationSteps) {
        lines.push(`║   ${step}`.slice(0, 60).padEnd(61) + '║');
      }
    }
    
    lines.push(chalk.cyan('╚' + '═'.repeat(60) + '╝'));
  }
  
  return lines.join('\n');
}

function formatStatus(status: string): string {
  switch (status) {
    case 'complete': return chalk.green('✓ Complete');
    case 'partial': return chalk.yellow('◐ Partial');
    case 'manual_required': return chalk.red('✋ Manual Required');
    default: return status;
  }
}

function formatConfidence(confidence: string): string {
  switch (confidence) {
    case 'HIGH': return chalk.green('HIGH');
    case 'MEDIUM': return chalk.yellow('MEDIUM');
    case 'LOW': return chalk.red('LOW');
    default: return confidence;
  }
}
```

#### Step 4: Extend FixResult in fixer.ts
```typescript
// src/core/fixer.ts - Line 3-6, modify FixResult interface
import type { PostUpdateGuidance } from './autofix/types.js';

export interface FixResult {
  fixed: number;
  warnings: string[];
  postUpdateGuidance?: PostUpdateGuidance[];  // NEW
}
```

#### Step 5: Update Autofix Command Options
```typescript
// src/commands/workflows/autofix.ts

// Add to AutofixOptions interface (line 21-30):
interface AutofixOptions {
  file?: string;
  apply?: boolean;
  experimental?: boolean;
  save?: string;
  json?: boolean;
  force?: boolean;
  yes?: boolean;
  backup?: boolean;
  guidance?: boolean;  // NEW - default true
}

// Add command option registration in src/cli.ts:
.option('--no-guidance', 'Suppress post-update guidance display')
```

#### Step 6: Integrate Guidance Display
```typescript
// src/commands/workflows/autofix.ts - After line 91 (after fixes applied)

import { formatPostUpdateGuidance } from '../../core/formatters/guidance.js';
import { formatDivider } from '../../core/formatters/header.js';

// ... existing code ...

// After totalFixes calculation (line 92), add:
const allGuidance = fixes
  .filter(f => f.postUpdateGuidance && f.postUpdateGuidance.length > 0)
  .flatMap(f => f.postUpdateGuidance!);

// JSON output (modify lines 94-103):
if (opts.json) {
  outputJson({
    source,
    totalFixes,
    fixes,
    postUpdateGuidance: allGuidance.length > 0 ? allGuidance : undefined,
    workflow: opts.apply ? workflow : undefined,
  });
  return;
}

// Human-friendly output - after line 130, before "Next actions":
if (opts.guidance !== false && allGuidance.length > 0) {
  console.log('');
  console.log(formatDivider('Post-Update Guidance'));
  console.log(formatPostUpdateGuidance(allGuidance));
}
```

---

## Testing Requirements

### Unit Tests

```typescript
// tests/core/autofix/post-update-validator.test.ts

describe('PostUpdateValidator', () => {
  describe('generateGuidance', () => {
    it('should return complete status when no remaining issues');
    it('should return partial status when some auto-migrated');
    it('should return manual_required when critical issues remain');
    it('should calculate HIGH confidence for complete migrations');
    it('should calculate LOW confidence for many remaining issues');
  });

  describe('documentBehaviorChanges', () => {
    it('should detect Execute Workflow v1.0→1.1 changes');
    it('should detect Webhook v2.0→2.1 changes');
    it('should return empty for nodes without known behavior changes');
  });

  describe('generateMigrationSteps', () => {
    it('should order steps: deprecations → critical → high → behavior → optional');
    it('should include final validation step');
  });

  describe('estimateTime', () => {
    it('should return "< 1 minute" for zero complexity');
    it('should return "20+ minutes" for high complexity');
  });
});
```

### Integration Tests

```typescript
// tests/commands/workflows/autofix.test.ts

describe('workflows autofix', () => {
  describe('--guidance flag', () => {
    it('should display guidance for version upgrades by default');
    it('should include guidance in JSON output');
    it('should respect --no-guidance flag');
    it('should show correct confidence levels');
    it('should list required manual actions');
  });
});
```

---

## Output Formats

### Terminal Output (Human-Readable)

```
╔════════════════════════════════════════════════════════════╗
║ ℹ Post-Update Guidance                                     ║
╠════════════════════════════════════════════════════════════╣
║ Node: HTTP Request (abc12345...)                           ║
║ Upgrade: v3 → v4.2                                         ║
║ Status: ◐ Partial                                          ║
║ Confidence: MEDIUM                                         ║
║ Est. Time: 5-10 minutes                                    ║
║                                                            ║
║ ⚠ Required Actions:                                        ║
║   [HIGH] sendBody: Must explicitly set for POST requests   ║
║                                                            ║
║ ℹ Behavior Changes:                                        ║
║   • Response structure: Data now at response.data          ║
║                                                            ║
║ ✓ Migration Steps:                                         ║
║   Step 1: Configure required properties                    ║
║     - sendBody: Set to true for POST/PUT/PATCH             ║
║   Step 2: Test workflow execution                          ║
║     - Validate all node configurations                     ║
║     - Run a test execution                                 ║
║     - Verify expected behavior                             ║
╚════════════════════════════════════════════════════════════╝
```

### JSON Output (Machine-Readable)

Following CLI pattern from README.md (`--json` guarantees structured output):

```json
{
  "source": "workflow.json",
  "totalFixes": 3,
  "fixes": [
    {
      "type": "invalidOptions",
      "count": 1,
      "description": "Fixed invalid options fields"
    }
  ],
  "postUpdateGuidance": [
    {
      "nodeId": "abc-123-def-456",
      "nodeName": "HTTP Request",
      "nodeType": "n8n-nodes-base.httpRequest",
      "oldVersion": "3",
      "newVersion": "4.2",
      "migrationStatus": "partial",
      "requiredActions": [
        {
          "type": "ADD_PROPERTY",
          "property": "sendBody",
          "reason": "Must explicitly set for POST requests in v4.2+",
          "suggestedValue": true,
          "priority": "HIGH"
        }
      ],
      "deprecatedProperties": [],
      "behaviorChanges": [
        {
          "aspect": "Response structure",
          "oldBehavior": "Data at response.body",
          "newBehavior": "Data at response.data",
          "impact": "MEDIUM",
          "actionRequired": true,
          "recommendation": "Update expressions using response.body to response.data"
        }
      ],
      "migrationSteps": [
        "Step 1: Configure required properties",
        "  - sendBody: Set to true for POST/PUT/PATCH",
        "Step 2: Test workflow execution"
      ],
      "confidence": "MEDIUM",
      "estimatedTime": "5-10 minutes"
    }
  ]
}
```

---

## Dependencies

| Dependency | Priority | Planning Doc | Blocks This |
|------------|----------|--------------|-------------|
| Node Version Service | P1 | `08-P1-node-version-service.md` | Yes - required |
| Breaking Change Detector | P1 | `09-P1-breaking-change-detector.md` | Yes - required |
| Advanced Autofix | P0 | `04-P0-advanced-autofix.md` | Related - benefits from |

### Dependency Chain

```
[08-P1] Node Version Service
    ↓ provides: compareVersions(), getLatestVersion()
[09-P1] Breaking Change Detector (uses version service)
    ↓ provides: analyzeVersionUpgrade(), DetectedChange[]
[13-P2] Post-Update Validator (uses both above)
    ↓ provides: PostUpdateGuidance
[04-P0] Advanced Autofix (integrates guidance into output)
    ↓ exposes: --guidance flag in CLI
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] `n8n workflows autofix <file>` displays post-update guidance by default
- [ ] `n8n workflows autofix <file> --no-guidance` suppresses guidance display
- [ ] `n8n workflows autofix <file> --json` includes `postUpdateGuidance` array
- [ ] Guidance shows for each node that was version-upgraded
- [ ] Confidence level (HIGH/MEDIUM/LOW) correctly calculated
- [ ] Migration status correctly determined (complete/partial/manual_required)
- [ ] Estimated time shown for manual actions
- [ ] Migration steps ordered by priority

### Edge Cases

- [ ] No guidance shown when no version upgrades occurred
- [ ] Works with both file and API-based autofix (`<id>` vs `<file>`)
- [ ] Handles nodes with no known behavior changes gracefully
- [ ] Empty `requiredActions` array handled correctly in output

### Output Quality

- [ ] Terminal output is readable and well-formatted (box characters align)
- [ ] JSON output follows documented schema exactly
- [ ] Guidance steps are actionable and clear
- [ ] Colors/icons match CLI theme (`src/core/formatters/theme.ts`)

### CLI Standards Compliance (from README.md)

- [ ] Exit code 0 on success, non-zero on failure
- [ ] `--json` output is always valid JSON
- [ ] `--quiet` suppresses guidance output
- [ ] `--verbose` shows additional debugging info

---

## Estimated Effort

| Task | Complexity | Files | LOC | Time |
|------|------------|-------|-----|------|
| Type definitions | Low | `src/core/autofix/types.ts` | ~80 | 1 hour |
| PostUpdateValidator port | Medium | `src/core/autofix/post-update-validator.ts` | ~250 | 4 hours |
| Guidance formatter | Low | `src/core/formatters/guidance.ts` | ~80 | 2 hours |
| Autofix integration | Low | `src/commands/workflows/autofix.ts` | ~30 | 1 hour |
| Fixer extension | Low | `src/core/fixer.ts` | ~5 | 0.5 hours |
| Type exports | Low | `src/types/index.ts` | ~3 | 0.5 hours |
| Unit tests | Medium | `tests/core/autofix/post-update-validator.test.ts` | ~150 | 3 hours |
| Integration tests | Low | `tests/commands/workflows/autofix.test.ts` | ~50 | 1 hour |
| **Total** | **Medium** | **8 files** | **~648** | **13 hours (~1.5 days)** |

**Note:** This estimate assumes 08-P1 and 09-P1 are already implemented. If not, add their effort first.

---

## MCP Pattern Complexity Assessment

**Verdict: MCP pattern is appropriate for CLI use case**

The MCP implementation is well-structured and not over-engineered:
- Clear separation of concerns (validator, detector, service)
- Focused interfaces with single responsibilities
- No unnecessary abstractions or over-generalization
- Directly portable to CLI with minimal adaptation

**Simplifications for CLI:**
- Can skip HTTP transport layer (direct function calls in CLI)
- Can use simpler caching (CLI is short-lived process)
- Can inline simple utility methods if needed
- Can merge some types if they're only used together

**Patterns to Preserve:**
- Confidence scoring (HIGH/MEDIUM/LOW) - essential for user trust
- Migration status tracking - users need to know what's left
- Step-by-step migration instructions - actionable guidance
- Estimated time - sets user expectations
