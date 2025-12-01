# read_notebook

Read and parse a Jupyter notebook file, displaying cells with IDs and outputs.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `AbsolutePath` | string | Yes | Absolute path to .ipynb file |

## Output

Formatted view of:
- Cell IDs
- Cell types (code/markdown)
- Cell contents
- Cell outputs
