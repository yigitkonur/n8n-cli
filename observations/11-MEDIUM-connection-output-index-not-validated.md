# Connection Output Index Not Validated

**Severity:** MEDIUM
**File Ref:** `src/core/validator.ts:318-365`
**Tags:** #Validation #n8nCompat #Connections

## 🔍 The Observation
The validator checks that connection source/target nodes exist, but doesn't validate that the output index is valid for the source node. A node with 1 output connected via index 5 passes validation but fails in n8n.

## 💻 Code Reference
```typescript
// src/core/validator.ts:339-360
for (const [outputType, branches] of Object.entries(outputs as Record<string, unknown>)) {
  if (!Array.isArray(branches)) continue;
  
  for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
    const branch = branches[branchIdx];
    // ...checks target node exists...
    // Missing: Check branchIdx < sourceNode.outputs.length!
  }
}
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Validating structure but not semantics. Connection topology looks valid but is impossible at runtime.
* **Best Practice:** Load source node's schema, check `outputs` array length, validate connection indices.
* **Reference:** n8n connection validation at workflow load

## 🛠️ Fix Plan
1. Look up source node in registry to get output count:
```typescript
const sourceNodeSchema = nodeRegistry.getNodeType(sourceNode.type);
const maxOutputs = sourceNodeSchema?.outputs?.length || 1;
if (branchIdx >= maxOutputs) {
  issues.push({
    code: 'INVALID_OUTPUT_INDEX',
    message: `Connection from "${sourceName}" uses output ${branchIdx} but node only has ${maxOutputs} outputs`
  });
}
```
2. Handle nodes with dynamic outputs (e.g., Switch) specially

## 💼 Business Impact
Invalid connections cause workflow load failures. Users get cryptic n8n errors instead of clear CLI validation feedback. Increases debugging time.

## 🔗 Evidences
- n8n validates connection indices at workflow load
- Schema-aware validation catches these issues pre-deployment
- Switch/If nodes have configurable output counts
