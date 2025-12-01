# User Database Registers Duplicate Signal Handlers

**Severity:** LOW
**File Ref:** `src/core/user-db/adapter.ts:154-157`
**Tags:** #reliability #signals #memory

## 🔍 The Observation

The user database adapter registers signal handlers in its constructor:

```typescript
constructor(private db: any) {
  // Register cleanup on process exit
  process.on('SIGINT', () => this.close());
  process.on('SIGTERM', () => this.close());
  process.on('beforeExit', () => this.close());
}
```

Problems:
1. **Duplicates lifecycle.ts handlers:** The main lifecycle module already handles these signals
2. **Multiple instances = multiple handlers:** Each instantiation adds new handlers
3. **No handler removal:** Handlers persist even after close()
4. **beforeExit redundancy:** Both lifecycle and user-db register

## 💻 Code Reference
```typescript
// src/core/user-db/adapter.ts:152-157
constructor(private db: any) {
  // Register cleanup on process exit
  process.on('SIGINT', () => this.close());
  process.on('SIGTERM', () => this.close());
  process.on('beforeExit', () => this.close());
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Registering handlers in constructor without cleanup. Duplicating global handlers.

*   **Best Practice:** 
    - Centralize signal handling in lifecycle.ts
    - Register cleanup callbacks instead of handlers
    - Use once() for one-time handlers
    - Remove handlers in close()

*   **Reference:** Node.js EventEmitter best practices, memory leak prevention

## 🛠️ Fix Plan

1.  Option A - Remove duplicate handlers (lifecycle handles it):
    ```typescript
    constructor(private db: any) {
      // Cleanup handled by lifecycle.ts - no handlers needed here
    }
    ```

2.  Option B - Use callback registration pattern:
    ```typescript
    // In lifecycle.ts
    const cleanupCallbacks: (() => void)[] = [];
    export function registerCleanup(fn: () => void) {
      cleanupCallbacks.push(fn);
    }
    
    // In user-db/adapter.ts
    import { registerCleanup } from '../lifecycle.js';
    constructor(private db: any) {
      registerCleanup(() => this.close());
    }
    ```

3.  **Carmack Lens:** Belt-and-suspenders approach is fine. Not a critical issue.

## 💼 Business Impact

*   **Very Low:** Double-close is idempotent
*   **Memory:** Minor leak if many adapter instances (unlikely)
*   **Code Clarity:** Confusing to have handlers in two places

## 🔗 Evidences

- Node.js EventEmitter can accumulate handlers (memory leak warning at 11)
- Idempotent close() prevents errors
- Centralized signal handling is cleaner
