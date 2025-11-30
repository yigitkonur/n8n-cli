# Excessive 'any' Types in Command Handlers

**Severity:** LOW
**File Ref:** `src/commands/workflows/autofix.ts:29`, `src/commands/workflows/validate.ts:30`
**Tags:** #TypeSafety #CodeQuality #Maintainability

## 🔍 The Observation
Multiple command handlers use `any` type for workflow objects instead of the proper `Workflow` type. This bypasses TypeScript's type checking and can hide bugs.

## 💻 Code Reference
```typescript
// src/commands/workflows/autofix.ts:29
let workflow: any;  // Should be Workflow

// src/commands/workflows/validate.ts:30
let workflow: any;  // Should be Workflow

// src/commands/workflows/update.ts:30
const workflow = jsonParse(content, { repairJSON: true }) as any;  // Should be Workflow

// src/commands/workflows/create.ts:31
const workflow = jsonParse(content, { repairJSON: true }) as any;  // Should be Workflow
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Using `any` defeats TypeScript's purpose. Typos in property access go undetected.
* **Best Practice:** Use proper types. If uncertain, use `unknown` with type guards or `Partial<Workflow>`.
* **Reference:** TypeScript strict mode best practices

## 🛠️ Fix Plan
1. Replace `any` with proper types:
```typescript
import type { Workflow } from '../../core/types.js';

let workflow: Workflow | null = null;
// or for parsed unknown:
let workflow: unknown;
if (isWorkflow(workflow)) { ... }
```
2. Add type guard function if needed
3. Enable `noImplicitAny` in tsconfig if not already

## 💼 Business Impact
Low - runtime behavior unchanged. But reduces TypeScript's ability to catch bugs during development. Harder to refactor safely.

## 🔗 Evidences
- TypeScript best practices discourage `any`
- ESLint @typescript-eslint/no-explicit-any rule
- Types exist in codebase but aren't consistently used
