# Testing Strategy

## Overview

Comprehensive testing approach covering unit tests, integration tests, and end-to-end scenarios.

## Test Structure

```
tests/
├── unit/
│   ├── commands/           # Command unit tests
│   │   ├── nodes/
│   │   ├── workflows/
│   │   └── executions/
│   ├── formatters/         # Formatter tests
│   ├── db/                 # Database query tests
│   └── utils/              # Utility tests
├── integration/
│   ├── api/                # API client tests
│   └── db/                 # Database tests
├── e2e/
│   └── scenarios/          # Full workflow scenarios
├── fixtures/
│   ├── workflows/          # Sample workflow JSONs
│   ├── nodes/              # Sample node configs
│   └── responses/          # Mock API responses
└── helpers/
    ├── mock-api.ts         # API mocking utilities
    ├── mock-db.ts          # Database mocking
    └── cli-runner.ts       # CLI test runner
```

## Test Framework

```json
{
  "devDependencies": {
    "vitest": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0",
    "msw": "^2.0.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "vitest run --config vitest.e2e.config.ts"
  }
}
```

## Unit Tests

### Command Tests

```typescript
// tests/unit/commands/nodes/SearchCommand.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodesSearchCommand } from '../../../../src/commands/nodes/SearchCommand.js';
import { createTestContext } from '../../../helpers/cli-runner.js';
import * as db from '../../../../src/core/db/nodes.js';

vi.mock('../../../../src/core/db/nodes.js');

describe('NodesSearchCommand', () => {
  let stdout: string;
  let stderr: string;

  beforeEach(() => {
    stdout = '';
    stderr = '';
    vi.clearAllMocks();
  });

  const runCommand = async (args: string[]) => {
    const context = createTestContext({
      onStdout: (data) => { stdout += data; },
      onStderr: (data) => { stderr += data; },
    });
    
    const command = new NodesSearchCommand();
    Object.assign(command, { context });
    
    // Parse args
    command.query = args[0];
    command.limit = 10;
    command.mode = 'OR';
    
    return command.execute();
  };

  it('should search nodes and display results', async () => {
    vi.mocked(db.searchNodes).mockReturnValue({
      nodes: [
        { nodeType: 'n8n-nodes-base.webhook', displayName: 'Webhook', category: 'Core', relevanceScore: 95 },
      ],
      totalFound: 1,
      query: 'webhook',
      mode: 'OR',
    });

    const exitCode = await runCommand(['webhook']);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('webhook');
    expect(stdout).toContain('Webhook');
    expect(db.searchNodes).toHaveBeenCalledWith(expect.objectContaining({
      query: 'webhook',
    }));
  });

  it('should save to file with --save flag', async () => {
    vi.mocked(db.searchNodes).mockReturnValue({
      nodes: [{ nodeType: 'test', displayName: 'Test', category: 'Test', relevanceScore: 90 }],
      totalFound: 1,
      query: 'test',
      mode: 'OR',
    });

    const command = new NodesSearchCommand();
    command.query = 'test';
    command.save = '/tmp/test.json';

    const exitCode = await command.execute();

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Saved');
  });

  it('should handle empty results', async () => {
    vi.mocked(db.searchNodes).mockReturnValue({
      nodes: [],
      totalFound: 0,
      query: 'nonexistent',
      mode: 'OR',
    });

    const exitCode = await runCommand(['nonexistent']);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('0');
  });

  it('should respect --limit flag', async () => {
    const command = new NodesSearchCommand();
    command.query = 'test';
    command.limit = 5;

    await command.execute();

    expect(db.searchNodes).toHaveBeenCalledWith(expect.objectContaining({
      limit: expect.any(Number),
    }));
  });
});
```

### Formatter Tests

```typescript
// tests/unit/formatters/table.test.ts
import { describe, it, expect } from 'vitest';
import { formatTable, formatters } from '../../../src/core/formatters/table.js';

describe('formatTable', () => {
  it('should render table with headers', () => {
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];

    const output = formatTable(data, {
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'age', header: 'Age' },
      ],
    });

    expect(output).toContain('Name');
    expect(output).toContain('Age');
    expect(output).toContain('Alice');
    expect(output).toContain('Bob');
  });

  it('should truncate with limit', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ id: i }));

    const output = formatTable(data, {
      columns: [{ key: 'id', header: 'ID' }],
      limit: 5,
    });

    expect(output).toContain('showing 5 of 20');
    expect(output).not.toContain('19'); // Last item shouldn't appear
  });

  it('should apply column formatters', () => {
    const data = [{ active: true }, { active: false }];

    const output = formatTable(data, {
      columns: [{
        key: 'active',
        header: 'Status',
        formatter: formatters.status,
      }],
    });

    expect(output).toContain('✓');
    expect(output).toContain('✗');
  });
});

describe('formatters', () => {
  it('should format status', () => {
    expect(formatters.status(true)).toContain('✓');
    expect(formatters.status(false)).toContain('✗');
  });

  it('should format score', () => {
    expect(formatters.score(95.123)).toBe('95.1');
  });

  it('should truncate long text', () => {
    const long = 'a'.repeat(50);
    const result = formatters.truncate(long, 10);
    expect(result.length).toBe(10);
    expect(result).toContain('…');
  });
});
```

## Integration Tests

### API Client Tests

```typescript
// tests/integration/api/client.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { N8NClient } from '../../../src/core/api/client.js';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('N8NClient', () => {
  const config = {
    n8nUrl: 'https://test.n8n.io',
    apiKey: 'test-key',
    timeout: 5000,
  };

  it('should fetch workflows', async () => {
    server.use(
      http.get('https://test.n8n.io/api/v1/workflows', () => {
        return HttpResponse.json({
          data: [{ id: 'wf1', name: 'Test', active: true }],
        });
      })
    );

    const client = new N8NClient(config);
    const result = await client.get('/workflows');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Test');
  });

  it('should handle 401 errors', async () => {
    server.use(
      http.get('https://test.n8n.io/api/v1/workflows', () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
      })
    );

    const client = new N8NClient(config);

    await expect(client.get('/workflows')).rejects.toThrow('401');
  });

  it('should handle timeouts', async () => {
    server.use(
      http.get('https://test.n8n.io/api/v1/workflows', async () => {
        await new Promise(r => setTimeout(r, 10000));
        return HttpResponse.json({});
      })
    );

    const client = new N8NClient({ ...config, timeout: 100 });

    await expect(client.get('/workflows')).rejects.toThrow('timeout');
  });
});
```

### Database Tests

```typescript
// tests/integration/db/nodes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { searchNodes, getNodeInfo } from '../../../src/core/db/nodes.js';
import { closeDatabase } from '../../../src/core/db/connection.js';

describe('Node Database', () => {
  afterAll(() => closeDatabase());

  it('should search nodes by keyword', () => {
    const result = searchNodes({ query: 'webhook' });

    expect(result.totalFound).toBeGreaterThan(0);
    expect(result.nodes[0].nodeType).toContain('webhook');
  });

  it('should support AND mode', () => {
    const result = searchNodes({ query: 'http request', mode: 'AND' });

    expect(result.nodes.every(n => 
      n.displayName.toLowerCase().includes('http') ||
      n.displayName.toLowerCase().includes('request')
    )).toBe(true);
  });

  it('should get node info', () => {
    const node = getNodeInfo('n8n-nodes-base.webhook');

    expect(node).not.toBeNull();
    expect(node?.displayName).toBe('Webhook');
    expect(node?.properties).toBeInstanceOf(Array);
  });
});
```

## E2E Tests

```typescript
// tests/e2e/scenarios/workflow-lifecycle.test.ts
import { describe, it, expect } from 'vitest';
import { runCLI } from '../../helpers/cli-runner.js';

describe('Workflow Lifecycle', () => {
  it('should list, get, validate a workflow', async () => {
    // List workflows
    const listResult = await runCLI(['workflows', 'list', '--limit', '1', '--json']);
    expect(listResult.exitCode).toBe(0);
    
    const workflows = JSON.parse(listResult.stdout);
    expect(workflows).toHaveLength(1);
    
    const workflowId = workflows[0].id;

    // Get workflow
    const getResult = await runCLI(['workflows', 'get', workflowId, '--json']);
    expect(getResult.exitCode).toBe(0);
    
    const workflow = JSON.parse(getResult.stdout);
    expect(workflow.id).toBe(workflowId);

    // Validate workflow
    const validateResult = await runCLI(['workflows', 'validate', '--id', workflowId]);
    expect(validateResult.exitCode).toBe(0);
  });
});
```

## Test Fixtures

```typescript
// tests/fixtures/workflows/simple-webhook.json
{
  "name": "Test Webhook",
  "nodes": [
    {
      "id": "webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 0],
      "parameters": {
        "httpMethod": "POST",
        "path": "test"
      }
    }
  ],
  "connections": {}
}
```

## CLI Test Runner

```typescript
// tests/helpers/cli-runner.ts
import { Cli } from 'clipanion';
import { Writable } from 'stream';

export interface CLIResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runCLI(args: string[]): Promise<CLIResult> {
  let stdout = '';
  let stderr = '';

  const cli = createCLI();

  const exitCode = await cli.run(args, {
    stdout: new Writable({
      write(chunk, _, callback) {
        stdout += chunk.toString();
        callback();
      },
    }),
    stderr: new Writable({
      write(chunk, _, callback) {
        stderr += chunk.toString();
        callback();
      },
    }),
  });

  return { exitCode, stdout, stderr };
}
```

## Coverage Requirements

| Component | Target |
|-----------|--------|
| Commands | 80% |
| Formatters | 90% |
| API Client | 85% |
| Database | 85% |
| Utils | 90% |
| **Overall** | **85%** |

## CI Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```
