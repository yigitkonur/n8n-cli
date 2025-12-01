# Esprima Parses Untrusted JavaScript Object Literals

**Severity:** LOW
**File Ref:** `src/core/json-parser.ts:39-46`
**Tags:** #security #input-validation #parsing

## 🔍 The Observation

The `jsonParse()` function with `acceptJSObject: true` uses esprima-next to parse JavaScript object literals (not just JSON). While this enables parsing of JS-style objects with unquoted keys, it also parses a broader syntax that could theoretically contain unexpected constructs.

The current implementation is safe (only extracts ObjectExpression nodes), but using a JavaScript parser for untrusted input is a broader attack surface than necessary.

## 💻 Code Reference
```typescript
// json-parser.ts:39-46
function parseJSObject(objectAsString: string): object {
  const jsExpression = esprimaParse(`(${objectAsString})`).body.find(
    (node): node is ExpressionStatement =>
      node.type === Syntax.ExpressionStatement && 
      node.expression.type === Syntax.ObjectExpression,
  );

  return syntaxNodeToValue(jsExpression?.expression) as object;
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Using a full JavaScript parser when a limited grammar would suffice. Increases complexity and potential attack surface.
*   **Best Practice:** Use the most restrictive parser possible. JSON5 provides unquoted keys without full JS parsing. Or: Accept only strict JSON.
*   **Reference:** [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) - Accept known good over sanitizing bad

## 🛠️ Fix Plan

1.  **Option A (Minimal change):** Document that `acceptJSObject` is for developer convenience only, not untrusted input.
2.  **Option B (Recommended):** Replace esprima with JSON5 parser for unquoted keys support.
3.  Current mitigations (MAX_JSON_SIZE, MAX_NESTING_DEPTH) are good but don't address parser complexity.

```typescript
// Option B: Use JSON5 instead of esprima
import JSON5 from 'json5';

export function jsonParse<T>(jsonString: string, options?: JSONParseOptions<T>): T {
  if (jsonString.length > MAX_JSON_SIZE) throw new Error('...');
  
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    if (options?.acceptJSObject) {
      return JSON5.parse(jsonString) as T;  // Safer than full JS parser
    }
    throw error;
  }
}
```

## 💼 Business Impact

**Security Note:** This is LOW severity because:
1. Current implementation only extracts data (no eval)
2. Nesting depth limit prevents DoS
3. Only ObjectExpression nodes are processed
4. Primarily used for workflow JSON files (semi-trusted)

**Practical Risk:** Near zero in current usage. Theoretical concern for future use cases.

**Effort:** ~1 hour if replacing with JSON5. No change needed for current risk level.

## 🔗 Evidences

- syntaxNodeToValue() only handles Literal, Identifier, ObjectExpression, ArrayExpression
- jsonrepair used for broken JSON is separate (also safe library)
- Workflow files are user-provided but not adversarial in typical use
