# edit_notebook

Replace, insert, or delete cells in Jupyter notebooks (.ipynb).

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `absolute_path` | string | Yes | Absolute path to .ipynb file |
| `cell_number` | integer | No | 0-indexed cell number (default: 0) |
| `cell_id` | string | No | Alternative to cell_number |
| `new_source` | string | No | New content for the cell |
| `edit_mode` | enum | No | `replace` (default), `insert`, or `delete` |
| `cell_type` | enum | No | `code` or `markdown` (required for insert) |

## Modes

- **replace**: Replace cell content at `cell_number`
- **insert**: Add new cell at `cell_number` index
- **delete**: Remove cell at `cell_number`
