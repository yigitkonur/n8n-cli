# Position Values Not Fully Validated

**Severity:** MEDIUM
**File Ref:** `src/core/validator.ts:242-262`
**Tags:** #Validation #EdgeCase #TypeSafety

## 🔍 The Observation
The validator checks that `position` is an array of length 2, but doesn't validate that the values are:
- Finite numbers (not NaN, Infinity)
- Reasonable range (not negative, not excessively large)
- Actually numbers (not strings that happen to be in an array)

## 💻 Code Reference
```typescript
// src/core/validator.ts:252-262
} else if (!Array.isArray(node.position) || node.position.length !== 2) {
  const issue = enrichWithSourceInfo({
    code: 'INVALID_POSITION',
    severity: 'error',
    message: `Node "${nodeName}" field 'position' must be an array of [x, y]`,
    // ...
  }, sourceMap, `${nodePath}.position`);
  // Missing: Validate position[0] and position[1] are valid numbers!
}
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Checking container type without validating contents. `["foo", NaN]` passes as valid position.
* **Best Practice:** Validate each element: `typeof x === 'number' && Number.isFinite(x) && x >= 0`.
* **Reference:** Defensive validation principle

## 🛠️ Fix Plan
1. Add element validation after array check:
```typescript
const [x, y] = node.position;
if (typeof x !== 'number' || typeof y !== 'number' || 
    !Number.isFinite(x) || !Number.isFinite(y)) {
  issues.push({
    code: 'INVALID_POSITION_VALUES',
    message: `Node "${nodeName}" position values must be finite numbers`,
    context: { value: node.position }
  });
}
```
2. Optionally warn on negative positions or extremely large values

## 💼 Business Impact
Invalid positions cause n8n UI rendering issues. Nodes may appear off-canvas or cause layout calculation errors. Edge case but leads to confusing user experience.

## 🔗 Evidences
- n8n editor uses position for canvas rendering
- NaN/Infinity cause JavaScript calculation issues
- Type coercion bugs are common source of runtime errors
