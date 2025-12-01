/**
 * User Database Module
 * Exports for accessing the writable user database at ~/.n8n-cli/data.db
 */

export {
  getUserDatabase,
  closeUserDatabase,
  createUserDatabaseAdapter,
  getUserDataDir,
  getUserDbPath,
  type UserDatabaseAdapter,
} from './adapter.js';
