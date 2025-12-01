# Environment Variable DB Path Not Validated for Traversal

**Severity:** LOW
**File Ref:** `src/core/config/loader.ts:172`
**Tags:** #security #configuration #input-validation

## 🔍 The Observation

The `N8N_DB_PATH` environment variable is used directly without path validation. While the database is opened in readonly mode (limiting impact), a user could potentially point to unexpected files:

```bash
N8N_DB_PATH=/etc/passwd n8n nodes list  # Would fail parsing, not security issue
N8N_DB_PATH=../../../other.db n8n nodes list  # Could read different SQLite
```

## 💻 Code Reference
```typescript
// loader.ts:172 - env var used directly
dbPath: process.env.N8N_DB_PATH,

// adapter.ts:77 - only existence check
const path = dbPath || getDefaultDbPath();
if (!existsSync(path)) {
  throw new Error(`Database not found: ${path}...`);
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Using user-provided paths without normalization or validation.
*   **Best Practice:** Resolve paths to absolute, check they fall within expected directories, and normalize to prevent traversal.
*   **Reference:** [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)

## 🛠️ Fix Plan

1.  Resolve and normalize paths before use:

```typescript
import { resolve, isAbsolute } from 'node:path';

export async function createDatabaseAdapter(dbPath?: string): Promise<DatabaseAdapter> {
  let path = dbPath || getDefaultDbPath();
  
  // Normalize path
  path = resolve(path);
  
  // Optional: Restrict to allowed directories
  const allowedDirs = [
    resolve(process.cwd(), 'data'),
    resolve(homedir(), '.n8n-cli'),
  ];
  
  if (!allowedDirs.some(dir => path.startsWith(dir))) {
    throw new Error(`Database path must be in ${allowedDirs.join(' or ')}`);
  }
  
  if (!existsSync(path)) {
    throw new Error(`Database not found: ${path}`);
  }
  // ...
}
```

## 💼 Business Impact

**Actual Risk:** Very low because:
1. Database is opened readonly - can't modify external files
2. SQLite rejects non-SQLite files - can't read arbitrary files
3. Environment variables are set by the user running the CLI

**Defensive Value:** Good practice, prevents potential future issues if readonly mode changes.

**Effort:** ~15 minutes for basic validation.

## 🔗 Evidences

- Readonly mode is enforced at database level
- SQLite validates file format on open
- This is defense-in-depth, not an active vulnerability
