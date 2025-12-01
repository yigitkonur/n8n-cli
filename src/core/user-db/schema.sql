-- n8n CLI User Database Schema
-- Location: ~/.n8n-cli/data.db
-- Purpose: Store user-specific data (workflow versions, settings, etc.)

-- Schema version tracking for migrations
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workflow versions table for rollback and version history tracking
-- Stores full workflow snapshots before modifications for guaranteed reversibility
-- Auto-prunes to 10 versions per workflow to prevent storage bloat
CREATE TABLE IF NOT EXISTS workflow_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,              -- n8n workflow ID
  version_number INTEGER NOT NULL,        -- Incremental version number (1, 2, 3...)
  workflow_name TEXT NOT NULL,            -- Workflow name at time of backup
  workflow_snapshot TEXT NOT NULL,        -- Full workflow JSON before modification
  trigger TEXT NOT NULL CHECK(trigger IN (
    'partial_update',                     -- Created by n8n_update_partial_workflow
    'full_update',                        -- Created by n8n_update_full_workflow  
    'autofix',                            -- Created by n8n_autofix_workflow
    'manual'                              -- Created by user via versions command
  )),
  operations TEXT,                        -- JSON array of diff operations (if partial update)
  fix_types TEXT,                         -- JSON array of fix types (if autofix)
  metadata TEXT,                          -- Additional context (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, version_number)
);

-- Indexes for workflow version queries
CREATE INDEX IF NOT EXISTS idx_wv_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wv_created_at ON workflow_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_wv_trigger ON workflow_versions(trigger);
