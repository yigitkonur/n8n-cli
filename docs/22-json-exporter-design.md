# JSON Exporter Design

## Overview

The JSON exporter handles file saving with atomic operations, jq recipe generation, and user-friendly confirmations.

## MCP Source Reference

**Patterns from:** CLI best practices for file I/O
**Adapt:** Add jq recipe suggestions for exploration

## Architecture

```
src/core/formatters/
├── json.ts           # Main JSON export functions
└── jq-recipes.ts     # jq command suggestions (context-aware)
```

## Core Functions

### saveJson()

```typescript
// src/core/formatters/json.ts
import { writeFile, mkdir, rename, unlink } from 'fs/promises';
import { dirname, resolve, extname } from 'path';
import { existsSync } from 'fs';

export interface SaveOptions {
  pretty?: boolean;       // Pretty print (default: true)
  atomic?: boolean;       // Atomic write (default: true)
  overwrite?: boolean;    // Overwrite existing (default: true)
  backup?: boolean;       // Create .bak before overwrite (default: false)
}

export interface SaveResult {
  path: string;
  size: number;
  created: boolean;
  backed_up?: string;
}

/**
 * Save data to JSON file with atomic write
 */
export async function saveJson<T>(
  path: string,
  data: T,
  options: SaveOptions = {}
): Promise<SaveResult> {
  const {
    pretty = true,
    atomic = true,
    overwrite = true,
    backup = false,
  } = options;

  // Resolve absolute path
  const absolutePath = resolve(process.cwd(), path);
  const dir = dirname(absolutePath);
  
  // Ensure directory exists
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  
  // Check for existing file
  const fileExists = existsSync(absolutePath);
  if (fileExists && !overwrite) {
    throw new FileExistsError(`File already exists: ${absolutePath}`);
  }
  
  // Create backup if requested
  let backedUpPath: string | undefined;
  if (fileExists && backup) {
    backedUpPath = `${absolutePath}.bak`;
    await rename(absolutePath, backedUpPath);
  }
  
  // Serialize JSON
  const json = pretty 
    ? JSON.stringify(data, null, 2) 
    : JSON.stringify(data);
  
  // Write file (atomic or direct)
  if (atomic) {
    const tempPath = `${absolutePath}.tmp.${Date.now()}`;
    try {
      await writeFile(tempPath, json, 'utf-8');
      await rename(tempPath, absolutePath);
    } catch (error) {
      // Clean up temp file on failure
      await unlink(tempPath).catch(() => {});
      throw error;
    }
  } else {
    await writeFile(absolutePath, json, 'utf-8');
  }
  
  // Calculate size
  const size = Buffer.byteLength(json, 'utf-8');
  
  return {
    path: absolutePath,
    size,
    created: !fileExists,
    backed_up: backedUpPath,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Custom errors
 */
export class FileExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileExistsError';
  }
}

export class SaveError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SaveError';
  }
}
```

### formatSaveConfirmation()

```typescript
// src/core/formatters/json.ts
import chalk from 'chalk';
import { formatFileSize } from './json.js';
import { getJqRecipes, JqRecipeType } from './jq-recipes.js';

export interface ConfirmationOptions {
  recipeType?: JqRecipeType;
  count?: number;
  context?: Record<string, string>;
}

export function formatSaveConfirmation(
  result: SaveResult,
  options: ConfirmationOptions = {}
): string {
  const { recipeType, count, context = {} } = options;
  
  let output = chalk.green(`✅ Saved to ${result.path}\n`);
  output += chalk.dim(`   Size: ${formatFileSize(result.size)}`);
  
  if (count !== undefined) {
    output += chalk.dim(` | ${count} items`);
  }
  
  if (result.backed_up) {
    output += chalk.dim(`\n   Backup: ${result.backed_up}`);
  }
  
  output += '\n';
  
  // Add jq recipes if type specified
  if (recipeType) {
    const recipes = getJqRecipes(recipeType, result.path);
    if (recipes.length > 0) {
      output += chalk.yellow('\n💡 jq recipes:\n');
      for (const recipe of recipes) {
        output += chalk.dim('   ') + chalk.green(recipe.command) + '\n';
      }
    }
  }
  
  return output;
}
```

## jq Recipe Library

### Recipe Types

```typescript
// src/core/formatters/jq-recipes.ts

export type JqRecipeType = 
  | 'nodes'
  | 'workflows'
  | 'executions'
  | 'templates'
  | 'validation'
  | 'workflow-detail'
  | 'execution-detail';

export interface JqRecipe {
  command: string;
  description: string;
}

export function getJqRecipes(type: JqRecipeType, filename: string): JqRecipe[] {
  const f = filename;
  
  const recipes: Record<JqRecipeType, JqRecipe[]> = {
    nodes: [
      { 
        command: `jq -r '.[].nodeType' ${f}`,
        description: 'Extract node types only'
      },
      {
        command: `jq -r '.[] | [.displayName, .category] | @csv' ${f}`,
        description: 'Export as CSV'
      },
      {
        command: `jq '.[] | select(.category == "Core Nodes")' ${f}`,
        description: 'Filter to Core Nodes'
      },
      {
        command: `jq 'sort_by(-.relevanceScore) | .[0:5]' ${f}`,
        description: 'Top 5 by relevance'
      },
    ],
    
    workflows: [
      {
        command: `jq -r '.[] | "\\(.id)\\t\\(.name)"' ${f}`,
        description: 'Tab-separated ID and name'
      },
      {
        command: `jq '.[] | select(.active)' ${f}`,
        description: 'Filter active workflows'
      },
      {
        command: `jq -r '.[].id' ${f}`,
        description: 'Extract IDs only'
      },
      {
        command: `jq 'group_by(.active) | map({active: .[0].active, count: length})' ${f}`,
        description: 'Count by active status'
      },
    ],
    
    executions: [
      {
        command: `jq '.[] | select(.status == "error")' ${f}`,
        description: 'Filter failed executions'
      },
      {
        command: `jq -r '.[] | "\\(.id)\\t\\(.status)\\t\\(.startedAt)"' ${f}`,
        description: 'Tab-separated list'
      },
      {
        command: `jq 'group_by(.status) | map({status: .[0].status, count: length})' ${f}`,
        description: 'Count by status'
      },
    ],
    
    templates: [
      {
        command: `jq -r '.[].name' ${f}`,
        description: 'Template names only'
      },
      {
        command: `jq 'sort_by(-.views) | .[0:10]' ${f}`,
        description: 'Top 10 by views'
      },
      {
        command: `jq '.[] | select(.complexity == "beginner")' ${f}`,
        description: 'Filter beginner templates'
      },
    ],
    
    validation: [
      {
        command: `jq '.errors[]' ${f}`,
        description: 'Extract errors only'
      },
      {
        command: `jq '.errors | length' ${f}`,
        description: 'Count errors'
      },
      {
        command: `jq -r '.errors[] | "\\(.node): \\(.message)"' ${f}`,
        description: 'Error messages per node'
      },
    ],
    
    'workflow-detail': [
      {
        command: `jq '.nodes[].name' ${f}`,
        description: 'Node names'
      },
      {
        command: `jq '.nodes[] | {name, type}' ${f}`,
        description: 'Node name and type pairs'
      },
      {
        command: `jq '.connections | keys' ${f}`,
        description: 'Connection sources'
      },
    ],
    
    'execution-detail': [
      {
        command: `jq '.data.resultData.runData | keys' ${f}`,
        description: 'Executed nodes'
      },
      {
        command: `jq '.data.resultData.runData | to_entries | map({node: .key, items: .value[0].data.main[0] | length})' ${f}`,
        description: 'Item counts per node'
      },
    ],
  };
  
  return recipes[type] || [];
}
```

### Contextual Recipe Selection

```typescript
// Automatically select best recipes based on data shape
export function detectRecipeType(data: unknown): JqRecipeType | null {
  if (!data || typeof data !== 'object') return null;
  
  // Array of items
  if (Array.isArray(data)) {
    const first = data[0];
    if (!first) return null;
    
    if ('nodeType' in first) return 'nodes';
    if ('active' in first && 'nodes' in first) return 'workflows';
    if ('status' in first && 'startedAt' in first) return 'executions';
    if ('views' in first && 'complexity' in first) return 'templates';
  }
  
  // Single object
  if ('nodes' in data && 'connections' in data) return 'workflow-detail';
  if ('data' in data && 'status' in data) return 'execution-detail';
  if ('errors' in data || 'warnings' in data) return 'validation';
  
  return null;
}
```

## Usage in Commands

```typescript
// Example: NodesSearchCommand
async execute(): Promise<number> {
  const results = await searchNodes(this.query);
  
  if (this.save) {
    const saveResult = await saveJson(this.save, results.nodes);
    
    this.context.stdout.write(formatSaveConfirmation(saveResult, {
      recipeType: 'nodes',
      count: results.nodes.length,
    }));
    
    return 0;
  }
  
  // ... terminal output
}
```

## Output Examples

### After Saving Nodes

```
✅ Saved to nodes.json
   Size: 45.2 KB | 47 items

💡 jq recipes:
   jq -r '.[].nodeType' nodes.json
   jq -r '.[] | [.displayName, .category] | @csv' nodes.json
   jq '.[] | select(.category == "Core Nodes")' nodes.json
   jq 'sort_by(-.relevanceScore) | .[0:5]' nodes.json
```

### After Saving Workflow

```
✅ Saved to workflow.json
   Size: 8.3 KB

💡 jq recipes:
   jq '.nodes[].name' workflow.json
   jq '.nodes[] | {name, type}' workflow.json
   jq '.connections | keys' workflow.json
```

### After Saving Validation Report

```
✅ Saved to validation.json
   Size: 2.1 KB

💡 jq recipes:
   jq '.errors[]' validation.json
   jq '.errors | length' validation.json
   jq -r '.errors[] | "\(.node): \(.message)"' validation.json
```

## Error Handling

```typescript
try {
  await saveJson(path, data);
} catch (error) {
  if (error instanceof FileExistsError) {
    this.error(`File already exists: ${path}`);
    this.log('Use --overwrite to replace existing file');
    return 1;
  }
  
  if (error.code === 'EACCES') {
    this.error(`Permission denied: ${path}`);
    return 1;
  }
  
  throw error;
}
```

## Dependencies

```json
{
  "dependencies": {}
}
```

No external dependencies - uses Node.js built-in `fs/promises`.

## Testing

```typescript
// tests/formatters/json.test.ts
import { saveJson, formatFileSize } from '../../src/core/formatters/json.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFile, rm } from 'fs/promises';

describe('saveJson', () => {
  const testDir = join(tmpdir(), 'n8n-cli-test');
  
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it('should save JSON with pretty print', async () => {
    const path = join(testDir, 'test.json');
    const data = { foo: 'bar' };
    
    const result = await saveJson(path, data);
    
    expect(result.created).toBe(true);
    const content = await readFile(path, 'utf-8');
    expect(content).toBe('{\n  "foo": "bar"\n}');
  });
  
  it('should create parent directories', async () => {
    const path = join(testDir, 'nested', 'deep', 'test.json');
    await saveJson(path, { test: true });
    
    const content = await readFile(path, 'utf-8');
    expect(JSON.parse(content)).toEqual({ test: true });
  });
  
  it('should do atomic write', async () => {
    const path = join(testDir, 'atomic.json');
    
    // Write initial
    await saveJson(path, { version: 1 });
    
    // Overwrite atomically
    await saveJson(path, { version: 2 });
    
    const content = await readFile(path, 'utf-8');
    expect(JSON.parse(content).version).toBe(2);
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });
});
```
