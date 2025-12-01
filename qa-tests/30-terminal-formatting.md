## Phase 29: Terminal Adaptability & Formatting

**Goal:** Test terminal width detection and output formatting adaptation.
**Source Truth:** `core/formatters/table.ts`, `core/formatters/tree.ts`
- `getTerminalWidth()` fallback to 80 (Line 46)
- `calculateColumnWidths()` logic (Line 54)

### 29.1 Viewport Adaptation

| Test ID | Test Case | Setup | Expected Result |
|---------|-----------|-------|-----------------|
| TTY-001 | Narrow Terminal | 40 columns | Table truncates heavily |
| TTY-002 | Wide Terminal | 200 columns | Table expands columns |
| TTY-003 | Compact Flag | `--compact` | Reduced padding |
| TTY-004 | No TTY Fallback | Pipe to file | Uses 80 column default |
| TTY-005 | JSON Mode | `--json` | No formatting |

```bash
echo "=== TTY-001: Narrow Terminal (40 cols) ==="
# Simulate narrow terminal via COLUMNS env var
COLUMNS=40 n8n nodes list --limit 3 2>&1 | head -10
# Table should truncate or wrap

echo "=== TTY-002: Wide Terminal (200 cols) ==="
COLUMNS=200 n8n nodes list --limit 3 2>&1 | head -10
# Table should expand to use more space

echo "=== TTY-004: No TTY Fallback ==="
# Pipe output - should use 80 column default
n8n nodes list --limit 3 > /tmp/output.txt
wc -L /tmp/output.txt  # Check max line length
rm /tmp/output.txt

echo "=== TTY-005: JSON Mode (No Formatting) ==="
n8n nodes list --limit 3 --json | jq 'type'
# Should output "object" - raw JSON, not formatted table
```

### 29.2 Table Formatter Behavior

| Test ID | Test Case | Data | Expected |
|---------|-----------|------|----------|
| TBL-001 | Long Values | 500+ char field | Truncates with "..." |
| TBL-002 | Empty Values | Null/undefined | Shows "-" or empty |
| TBL-003 | Unicode | Japanese/emoji | Proper width calc |
| TBL-004 | ANSI Colors | Colored output | Doesn't break widths |

```bash
echo "=== TBL-003: Unicode Support ==="
# Search for node that might have unicode (or test display)
n8n nodes list --limit 5 | head -10
# Verify table alignment is correct

echo "=== TBL-004: Color Output ==="
# Check if colors are output (depends on TTY)
n8n nodes list --limit 3 2>&1 | cat -v | grep -E '\^\[\[' && echo "Colors detected" || echo "No colors"
```

### 29.3 Tree Formatter (Workflow Structure)

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| TRE-001 | Deep Nesting | 10-level workflow | Tree renders |
| TRE-002 | Wide Branching | IF with 5 branches | All branches shown |
| TRE-003 | Disconnected | Orphan nodes | Marked separately |

```bash
echo "=== TRE-001: Tree Structure Display ==="
# Get a workflow and view its structure
WF_ID=$(n8n workflows list -l 1 --json 2>/dev/null | jq -r '.data[0].id // empty')
if [ -n "$WF_ID" ]; then
    n8n workflows get $WF_ID --mode structure 2>&1 | head -20
fi
```

### 29.4 Compact Mode

| Test ID | Test Case | Flag | Expected |
|---------|-----------|------|----------|
| CMP-001 | Compact Nodes | `--compact` | Minimal padding |
| CMP-002 | Default Spacing | No flag | Standard padding |
| CMP-003 | Verbose Mode | `-v` | Extra details |

```bash
echo "=== CMP-001: Compact Output ==="
n8n nodes list --limit 5 --compact 2>&1 | head -10

echo "=== CMP-002: Default Spacing ==="
n8n nodes list --limit 5 2>&1 | head -10

echo "=== CMP-003: Verbose Mode ==="
n8n nodes list --limit 5 -v 2>&1 | head -15
```

---

## Source Code Reference

**`core/formatters/table.ts`:**
```typescript
// Line 46: getTerminalWidth() - returns process.stdout.columns || 80
// Line 54: calculateColumnWidths() - distributes width among columns
// Handles truncation, Unicode width calculation, ANSI escape sequences
```

**`core/formatters/tree.ts`:**
```typescript
// Renders workflow structure as ASCII tree
// Handles branching, loops, disabled nodes
```
