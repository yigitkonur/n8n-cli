/**
 * Credential Type Registry
 * Loads and provides access to credential type definitions from n8n-nodes-base
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { debug } from './debug.js';

const require = createRequire(import.meta.url);

/**
 * Auth method types
 */
export type AuthType = 'OAuth2' | 'API Key' | 'Basic Auth' | 'Bearer' | 'Custom';

/**
 * Credential type property definition
 */
export interface CredentialProperty {
  name: string;
  displayName: string;
  type: string;
  default?: any;
  required?: boolean;
  description?: string;
  typeOptions?: Record<string, any>;
  options?: Array<{ name: string; value: any }>;
}

/**
 * Credential type definition
 */
export interface CredentialTypeInfo {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: CredentialProperty[];
  authType: AuthType;
  propertyCount: number;
}

/**
 * Failed load tracking for diagnostics
 */
interface FailedLoad {
  path: string;
  error: string;
  type: 'require' | 'instantiate';
}

/**
 * Credential Registry - Loads credential types from n8n-nodes-base
 */
export class CredentialRegistry {
  private credentialTypes: Map<string, any> = new Map();
  private initialized = false;
  private failedLoads: FailedLoad[] = [];

  init() {
    if (this.initialized) {return;}

    let credsRoot: string;
    try {
      const n8nBasePath = require.resolve('n8n-nodes-base/package.json');
      credsRoot = path.join(
        path.dirname(n8nBasePath),
        'dist',
        'credentials',
      );
      debug('credential-loader', `Found n8n-nodes-base at: ${path.dirname(n8nBasePath)}`);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      debug('credential-loader', `Could not locate n8n-nodes-base: ${errorMsg}`);
      throw new Error(
        'Could not locate n8n-nodes-base package. Please ensure it is installed:\n' +
        '  npm install n8n-nodes-base\n\n' +
        'This package is required for credential type schema lookups.'
      );
    }

    if (!fs.existsSync(credsRoot)) {
      debug('credential-loader', `Credentials directory not found: ${credsRoot}`);
      console.warn(`Warning: n8n-nodes-base found but credentials directory missing at: ${credsRoot}`);
      this.initialized = true;
      return;
    }

    debug('credential-loader', `Scanning credentials from: ${credsRoot}`);
    this.scanDirectory(credsRoot);
    debug('credential-loader', `Loaded ${this.credentialTypes.size} credential types, ${this.failedLoads.length} failures`);
    this.initialized = true;
  }

  private scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith('.credentials.js')) {
        this.loadCredentialFile(fullPath);
      }
    }
  }

  private loadCredentialFile(filePath: string) {
    try {
      const module = require(filePath);
      
      for (const key in module) {
        const ExportedClass = module[key];
        if (typeof ExportedClass === 'function' && ExportedClass.prototype) {
          try {
            const instance = new ExportedClass();
            if (instance.name && instance.displayName && Array.isArray(instance.properties)) {
              this.credentialTypes.set(instance.name, instance);
            }
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            debug('credential-loader', `Failed to instantiate ${key} from ${filePath}: ${errorMsg}`);
            this.failedLoads.push({
              path: filePath,
              error: errorMsg,
              type: 'instantiate',
            });
          }
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      debug('credential-loader', `Failed to require ${filePath}: ${errorMsg}`);
      this.failedLoads.push({
        path: filePath,
        error: errorMsg,
        type: 'require',
      });
    }
  }

  /**
   * Infer authentication type from credential properties
   */
  private inferAuthType(cred: any): AuthType {
    const props = (cred.properties || []).map((p: any) => p.name?.toLowerCase() || '');
    const allText = props.join(' ');
    
    // OAuth2 detection
    if (
      props.includes('clientid') ||
      props.includes('clientsecret') ||
      allText.includes('oauth') ||
      props.includes('accesstokenurl') ||
      props.includes('authorizationurl')
    ) {
      return 'OAuth2';
    }
    
    // Basic Auth detection
    if (
      (props.includes('user') || props.includes('username')) &&
      props.includes('password')
    ) {
      return 'Basic Auth';
    }
    
    // Bearer token detection
    if (props.includes('accesstoken') || props.includes('bearertoken')) {
      return 'Bearer';
    }
    
    // API Key detection
    if (
      props.includes('apikey') ||
      props.includes('api_key') ||
      props.includes('token') ||
      props.some((p: string) => p.includes('key') && !p.includes('webhook'))
    ) {
      return 'API Key';
    }
    
    return 'Custom';
  }

  /**
   * Get a credential type by name
   */
  getCredentialType(name: string): CredentialTypeInfo | null {
    this.init();
    
    const cred = this.credentialTypes.get(name);
    if (!cred) {return null;}

    return {
      name: cred.name,
      displayName: cred.displayName,
      documentationUrl: cred.documentationUrl,
      properties: (cred.properties || []).map((p: any) => ({
        name: p.name,
        displayName: p.displayName,
        type: p.type || 'string',
        default: p.default,
        required: p.required,
        description: p.description,
        typeOptions: p.typeOptions,
        options: p.options,
      })),
      authType: this.inferAuthType(cred),
      propertyCount: (cred.properties || []).length,
    };
  }

  /**
   * Get all credential types
   */
  getAllCredentialTypes(): CredentialTypeInfo[] {
    this.init();
    
    const result: CredentialTypeInfo[] = [];
    
    for (const [name] of this.credentialTypes) {
      const info = this.getCredentialType(name);
      if (info) {
        result.push(info);
      }
    }
    
    return result.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Search credential types by query
   */
  searchCredentialTypes(query: string, limit: number = 20): CredentialTypeInfo[] {
    this.init();
    
    const queryLower = query.toLowerCase();
    const results: Array<{ cred: CredentialTypeInfo; score: number }> = [];
    
    for (const [name] of this.credentialTypes) {
      const info = this.getCredentialType(name);
      if (!info) {continue;}
      
      let score = 0;
      
      // Exact match in name
      if (name.toLowerCase() === queryLower) {
        score += 100;
      } else if (name.toLowerCase().includes(queryLower)) {
        score += 50;
      }
      
      // Match in displayName
      if (info.displayName.toLowerCase().includes(queryLower)) {
        score += 30;
      }
      
      if (score > 0) {
        results.push({ cred: info, score });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.cred);
  }

  /**
   * Get credential types grouped by auth method
   */
  getCredentialsByAuthType(): Record<AuthType, CredentialTypeInfo[]> {
    this.init();
    
    const grouped: Record<AuthType, CredentialTypeInfo[]> = {
      'OAuth2': [],
      'API Key': [],
      'Basic Auth': [],
      'Bearer': [],
      'Custom': [],
    };
    
    for (const [name] of this.credentialTypes) {
      const info = this.getCredentialType(name);
      if (info) {
        grouped[info.authType].push(info);
      }
    }
    
    // Sort each group
    const authTypes: AuthType[] = ['OAuth2', 'API Key', 'Basic Auth', 'Bearer', 'Custom'];
    for (const auth of authTypes) {
      grouped[auth].sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    
    return grouped;
  }

  /**
   * Get auth method statistics
   */
  getAuthMethodStats(): Array<{ authType: AuthType; count: number }> {
    const grouped = this.getCredentialsByAuthType();
    
    return (Object.keys(grouped) as AuthType[])
      .map(authType => ({
        authType,
        count: grouped[authType].length,
      }))
      .filter(stat => stat.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get count of loaded credential types
   */
  getLoadedCount(): number {
    this.init();
    return this.credentialTypes.size;
  }

  /**
   * Get count of failed loads
   */
  getFailedCount(): number {
    return this.failedLoads.length;
  }

  /**
   * Get load errors for diagnostics
   */
  getLoadErrors(): FailedLoad[] {
    return [...this.failedLoads];
  }
}

// Singleton instance
export const credentialRegistry = new CredentialRegistry();
