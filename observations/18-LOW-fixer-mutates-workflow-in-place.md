# Fixer Mutates Workflow In-Place

**Severity:** LOW
**File Ref:** `src/core/fixer.ts:52-53`
**Tags:** #Immutability #FunctionalProgramming #Debugging

## 🔍 The Observation
The fixer functions mutate the input workflow object directly instead of returning a new copy. This can cause subtle bugs if the original object is needed for comparison or rollback.

## 💻 Code Reference
```typescript
// src/core/fixer.ts:52-53
if (...) {
  delete (parameters as any).options;  // Mutates input!
  fixed++;
}

// src/core/fixer.ts:132
conditions.options = opts;  // Mutates input!

// src/core/fixer.ts:184
(parameters.options as Record<string, unknown>).fallbackOutput = fallbackValue;  // Mutates!
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** In-place mutation makes debugging harder. Caller can't compare before/after without cloning.
* **Best Practice:** Return new object with changes. Use `structuredClone()` or spread operators.
* **Reference:** Functional programming immutability patterns

## 🛠️ Fix Plan
1. Clone workflow before mutation:
```typescript
export function applyExperimentalFixes(
  workflow: Workflow,
  fixes: ExperimentalFix[] = defaultExperimentalFixes,
): { workflow: Workflow; result: FixResult } {
  const cloned = structuredClone(workflow);
  // Apply fixes to cloned...
  return { workflow: cloned, result };
}
```
2. Update callers to use returned workflow
3. Document mutation behavior if keeping for performance

## 💼 Business Impact
Low - current code works because callers expect mutation. But hinders adding diff/preview features and makes debugging harder.

## 🔗 Evidences
- Immutability is a JavaScript best practice
- structuredClone() is available in Node.js 17+
- Redux/React patterns avoid mutation for predictability
