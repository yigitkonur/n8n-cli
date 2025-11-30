# Build and Distribution

## Overview

Build configuration using tsup, npm package setup, and distribution strategy.

## Build Tool: tsup

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  
  // Bundle all dependencies except native modules
  noExternal: [/.*/],
  external: ['better-sqlite3'],
  
  // Add shebang for CLI
  banner: {
    js: '#!/usr/bin/env node',
  },
  
  // Copy static assets
  onSuccess: async () => {
    const { copyFile, mkdir } = await import('fs/promises');
    await mkdir('dist/data', { recursive: true });
    await copyFile('data/nodes.db', 'dist/data/nodes.db');
  },
});
```

## Package.json

```json
{
  "name": "n8n-cli",
  "version": "1.0.0",
  "description": "Human-first CLI for n8n workflow automation",
  "type": "module",
  "bin": {
    "n8n": "./dist/cli.js"
  },
  "files": [
    "dist",
    "data/nodes.db"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/cli.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.3",
    "clipanion": "^4.0.0-rc.16",
    "ora": "^8.0.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.10.0",
    "tsup": "^8.0.1",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  },
  "keywords": [
    "n8n",
    "cli",
    "workflow",
    "automation"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/n8n-cli"
  }
}
```

## TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Directory Structure (Final)

```
cli/
├── src/
│   ├── cli.ts                    # Entry point
│   ├── commands/
│   │   ├── base.ts
│   │   ├── nodes/
│   │   ├── workflows/
│   │   ├── executions/
│   │   ├── templates/
│   │   ├── health/
│   │   └── docs/
│   ├── core/
│   │   ├── api/
│   │   ├── db/
│   │   ├── formatters/
│   │   ├── validators/
│   │   └── utils/
│   └── types/
├── data/
│   └── nodes.db                  # Bundled database
├── dist/                         # Build output
│   ├── cli.js
│   └── data/
│       └── nodes.db
├── tests/
├── docs/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Native Module Handling

better-sqlite3 requires native compilation. Handle this:

```json
// package.json
{
  "scripts": {
    "postinstall": "node scripts/check-sqlite.js"
  }
}
```

```javascript
// scripts/check-sqlite.js
const { execSync } = require('child_process');

try {
  require('better-sqlite3');
  console.log('✅ SQLite native module ready');
} catch (error) {
  console.log('⚠️  Rebuilding SQLite native module...');
  execSync('npm rebuild better-sqlite3', { stdio: 'inherit' });
}
```

## Database Bundling

```javascript
// scripts/copy-db.js
import { copyFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function copyDatabase() {
  const src = join(root, '../n8n-mcp/data/nodes.db');
  const dest = join(root, 'data/nodes.db');
  
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
  
  console.log('✅ Copied nodes.db');
}

copyDatabase();
```

## Publishing

### npm

```bash
# Login
npm login

# Publish
npm publish

# Publish beta
npm publish --tag beta
```

### GitHub Releases

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm run build
      - run: npm run test
      
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

## Installation Methods

### npm (recommended)

```bash
npm install -g n8n-cli
```

### npx (no install)

```bash
npx n8n-cli workflows list
```

### From source

```bash
git clone https://github.com/your-org/n8n-cli
cd n8n-cli
npm install
npm run build
npm link
```

## Version Management

```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major
```

## Post-Install Verification

```javascript
// scripts/verify-install.js
import { execSync } from 'child_process';

try {
  const version = execSync('n8n --version', { encoding: 'utf-8' });
  console.log(`✅ n8n-cli installed: ${version.trim()}`);
  
  // Test database
  execSync('n8n nodes search webhook --limit 1', { encoding: 'utf-8' });
  console.log('✅ Node database working');
  
} catch (error) {
  console.error('❌ Installation verification failed');
  console.error(error.message);
  process.exit(1);
}
```

## Size Optimization

| Component | Size |
|-----------|------|
| CLI bundle | ~200 KB |
| nodes.db | ~15 MB |
| Dependencies | ~5 MB |
| **Total** | **~20 MB** |

### Reducing size:

```typescript
// tsup.config.ts
export default defineConfig({
  minify: true,
  treeshake: true,
});
```

## Platform Support

| Platform | Status |
|----------|--------|
| macOS (Intel) | ✅ |
| macOS (ARM) | ✅ |
| Linux (x64) | ✅ |
| Linux (ARM) | ✅ |
| Windows (x64) | ✅ |

Native module (better-sqlite3) is compiled on install for each platform.
