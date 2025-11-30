/**
 * Backup Utility
 * Task 03: Backup Before Workflow Mutations
 */

import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';

/**
 * Default backup directory
 */
export const BACKUP_DIR = join(homedir(), '.n8n-cli', 'backups');

/**
 * Generate ISO timestamp for backup filenames
 * Format: 2024-01-15T10-30-45-123Z (filesystem-safe)
 */
function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(dir: string = BACKUP_DIR): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Create a backup of a local file
 * 
 * @param filePath - Path to the file to backup
 * @returns Path to the backup file
 */
export async function createFileBackup(filePath: string): Promise<string> {
  const timestamp = getTimestamp();
  const backupPath = `${filePath}.backup-${timestamp}.json`;
  
  await copyFile(filePath, backupPath);
  
  return backupPath;
}

/**
 * Save a workflow backup to the backup directory
 * Used for API workflow mutations
 * 
 * @param workflow - The workflow object to backup
 * @param workflowId - The workflow ID
 * @returns Path to the backup file
 */
export async function saveWorkflowBackup(
  workflow: object,
  workflowId: string
): Promise<string> {
  await ensureBackupDir();
  
  const timestamp = getTimestamp();
  const filename = `workflow-${workflowId}-${timestamp}.json`;
  const backupPath = join(BACKUP_DIR, filename);
  
  await writeFile(backupPath, JSON.stringify(workflow, null, 2), 'utf8');
  
  return backupPath;
}

/**
 * Log backup creation message
 */
export function logBackupCreated(backupPath: string): void {
  console.log(chalk.dim(`  📦 Backup saved to ${backupPath}`));
}

/**
 * Options for backup operations
 */
export interface BackupOptions {
  /** Skip creating backup */
  noBackup?: boolean;
}

/**
 * Perform backup if enabled
 * Returns backup path or null if skipped
 */
export async function maybeBackupFile(
  filePath: string,
  options: BackupOptions = {}
): Promise<string | null> {
  if (options.noBackup) {
    return null;
  }
  
  const backupPath = await createFileBackup(filePath);
  logBackupCreated(backupPath);
  return backupPath;
}

/**
 * Perform workflow backup if enabled
 * Returns backup path or null if skipped
 */
export async function maybeBackupWorkflow(
  workflow: object,
  workflowId: string,
  options: BackupOptions = {}
): Promise<string | null> {
  if (options.noBackup) {
    return null;
  }
  
  const backupPath = await saveWorkflowBackup(workflow, workflowId);
  logBackupCreated(backupPath);
  return backupPath;
}
