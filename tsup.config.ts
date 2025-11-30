import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  shims: false,
  external: [
    'better-sqlite3',
    'n8n-nodes-base',
    'n8n-workflow',
    // Keep all deps external for ESM compatibility
    'commander',
    'chalk',
    'cli-table3',
    'ora',
    'axios',
  ],
});
