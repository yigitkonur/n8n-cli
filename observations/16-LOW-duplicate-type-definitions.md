# Duplicate Type Definitions

**Severity:** LOW
**File Ref:** `src/core/config/loader.ts:8-19`, `src/types/config.ts:5-16`
**Tags:** #CodeQuality #DRY #TypeScript

## 🔍 The Observation
The `CliConfig` interface is defined in two places:
1. `src/core/config/loader.ts` (lines 8-19)
2. `src/types/config.ts` (lines 5-16)

Both definitions are identical. This violates DRY principle and creates maintenance burden - changes must be synchronized.

## 💻 Code Reference
```typescript
// src/core/config/loader.ts:8-19
export interface CliConfig {
  /** n8n instance URL */
  host: string;
  /** n8n API key */
  apiKey: string;
  /** Request timeout in ms */
  timeout: number;
  /** Path to nodes database */
  dbPath: string;
  /** Enable debug logging */
  debug: boolean;
}

// src/types/config.ts:5-16 - IDENTICAL COPY!
export interface CliConfig {
  // ... same fields
}
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Duplicating type definitions. Drift between copies causes subtle bugs.
* **Best Practice:** Single source of truth. Export from one location, re-export if needed.
* **Reference:** DRY (Don't Repeat Yourself) principle

## 🛠️ Fix Plan
1. Remove definition from `loader.ts`
2. Import from `types/config.ts`:
```typescript
import type { CliConfig } from '../../types/config.js';
```
3. Or vice versa - centralize in loader.ts and re-export from types

## 💼 Business Impact
Low - TypeScript catches type mismatches at compile time. But adds maintenance burden and confusion about canonical definition.

## 🔗 Evidences
- TypeScript best practices recommend centralized type definitions
- Duplicate code is a code smell
- index.ts re-exports suggest types should be in types/ directory
