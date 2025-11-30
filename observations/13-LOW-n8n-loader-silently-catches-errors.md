# n8n Loader Silently Catches Errors

**Severity:** LOW
**File Ref:** `src/core/n8n-loader.ts:48-73`
**Tags:** #Debugging #ErrorHandling #Observability

## 🔍 The Observation
The NodeRegistry silently catches and ignores errors during node loading. If a node file fails to require or instantiate, no warning is emitted. This makes debugging missing node types very difficult.

## 💻 Code Reference
```typescript
// src/core/n8n-loader.ts:48-73
private loadNodeFile(filePath: string) {
  try {
    const module = require(filePath);
    
    for (const key in module) {
      const ExportedClass = module[key];
      if (typeof ExportedClass === 'function' && ExportedClass.prototype) {
        try {
          const instance = new ExportedClass();
          // ...
        } catch (e) {
          // Ignore instantiation errors (some helpers might export classes that assume env)
        }
      }
    }
  } catch (e) {
    // Ignore require errors  <- Silent failure!
  }
}
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Empty catch blocks that hide errors. "Ignore" comments don't help debugging.
* **Best Practice:** Log errors at debug level. Maintain count of failed loads. Surface issues when node is referenced.
* **Reference:** Fail-fast vs silent degradation tradeoffs

## 🛠️ Fix Plan
1. Add debug logging for failed loads:
```typescript
} catch (e) {
  if (process.env.N8N_DEBUG === 'true') {
    console.warn(`[DEBUG] Failed to load node: ${filePath}`, e.message);
  }
  this.failedLoads.push({ path: filePath, error: e.message });
}
```
2. Add `getLoadErrors()` method for diagnostics
3. When `UNKNOWN_NODE_TYPE` is returned, check if node failed to load

## 💼 Business Impact
Low direct impact (readonly node DB is fallback), but debugging node resolution issues is time-consuming. New n8n versions with breaking node changes are hard to diagnose.

## 🔗 Evidences
- Silent failures are anti-pattern in production systems
- Debug logging enables troubleshooting without code changes
- n8n-nodes-base occasionally has breaking changes
