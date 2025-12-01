# JSON Size Limit of 10MB May Be Excessive

**Severity:** LOW
**File Ref:** `src/core/json-parser.ts:5`
**Tags:** #security #performance #dos-prevention

## 🔍 The Observation

The JSON parser allows up to 10MB input:

```typescript
const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB
```

While this protects against extremely large payloads, considerations:
- Typical n8n workflow JSON: 10KB - 500KB
- Large workflows with embedded data: 1-2MB
- 10MB allows significant memory consumption
- CLI typically runs on user machines with memory constraints

A 10MB JSON can expand to 30-50MB in parsed form due to object overhead.

## 💻 Code Reference
```typescript
// src/core/json-parser.ts:5
const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB

// src/core/json-parser.ts:49
if (jsonString.length > MAX_JSON_SIZE) {
  throw new Error(`JSON input exceeds maximum size of ${MAX_JSON_SIZE / 1024 / 1024}MB`);
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Current Pattern:** 10MB limit. Safe but generous.

*   **Alternative:** 
    - 5MB for CLI operations (still handles any reasonable workflow)
    - 2MB for most operations, with `--allow-large` flag for exceptions
    - Streaming JSON parsing for truly large files

*   **Reference:** JSON parsing memory overhead, Node.js memory limits

## 🛠️ Fix Plan

1.  Reduce default limit:
    ```typescript
    const MAX_JSON_SIZE = 5 * 1024 * 1024; // 5MB - handles 99% of workflows
    ```

2.  Add configurable limit:
    ```typescript
    const MAX_JSON_SIZE = parseInt(
      process.env.N8N_MAX_JSON_SIZE || '5242880', 10
    );
    ```

3.  Add helpful error message with workaround:
    ```typescript
    throw new Error(
      `JSON exceeds ${MAX_JSON_SIZE/1024/1024}MB limit. ` +
      `Set N8N_MAX_JSON_SIZE env var for larger files.`
    );
    ```

4.  **Carmack Lens:** 10MB is fine. This is defensive documentation, not a real issue.

## 💼 Business Impact

*   **Very Low:** 10MB is already protective
*   **Memory:** Worst case 50MB heap for 10MB JSON is acceptable
*   **Documentation:** Clarify limits in help text

## 🔗 Evidences

- JSON parsing typically 3-5x memory of string size
- npm package.json limit is 10KB, workflow JSON is 1000x larger
- Streaming parsers (like JSONStream) for truly large files
