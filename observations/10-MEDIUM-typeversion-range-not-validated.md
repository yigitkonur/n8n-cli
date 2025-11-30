# TypeVersion Range Not Validated

**Severity:** MEDIUM
**File Ref:** `src/core/validator.ts:219-239`
**Tags:** #Validation #n8nCompat #EdgeCase

## 🔍 The Observation
The validator checks that `typeVersion` is a number but doesn't validate that it's within the valid range for the node type. A workflow with `typeVersion: 99` passes CLI validation but fails when loaded by n8n (version doesn't exist).

The node registry loads node types but the validator doesn't query available versions.

## 💻 Code Reference
```typescript
// src/core/validator.ts:219-239
// Check 'typeVersion'
if (node.typeVersion === undefined) {
  // ... error for missing
} else if (typeof node.typeVersion !== 'number') {
  // ... error for wrong type
}
// Missing: Check if typeVersion is valid for this node type!

// src/core/n8n-loader.ts:76-88
getNodeType(nodeType: string, version?: number): INodeTypeDescription | null {
  // ...
  if (nodeInstance instanceof CjsVersionedNodeType) {
    const resolvedVersion = version ?? ...;
    const concrete = vt.getNodeType(resolvedVersion);  // Throws if invalid!
    return concrete.description;
  }
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Type checking without semantic validation. Syntactically valid but semantically wrong values pass.
* **Best Practice:** Query available versions from node registry and validate typeVersion is in range.
* **Reference:** n8n-workflow VersionedNodeType.getVersions()

## 🛠️ Fix Plan
1. After type check, query registry for valid versions:
```typescript
const nodeDesc = nodeRegistry.getNodeType(node.type, node.typeVersion);
if (!nodeDesc && nodeRegistry.getNodeType(node.type)) {
  // Node exists but version doesn't
  issues.push({
    code: 'INVALID_TYPE_VERSION_RANGE',
    message: `Node "${nodeName}" has invalid typeVersion ${node.typeVersion}`,
    hint: `Available versions: ${availableVersions.join(', ')}`
  });
}
```
2. Cache version lists per node type for performance

## 💼 Business Impact
Workflows pass validation but fail at runtime in n8n. Users trust the validation result, leading to deployment failures. Debugging requires n8n logs rather than CLI feedback.

## 🔗 Evidences
- n8n VersionedNodeType throws on invalid version
- Validation should match runtime behavior
- GitHub #14998 discusses version resolution issues
