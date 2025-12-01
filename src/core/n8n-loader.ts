import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import type { INodeType, INodeTypeDescription, VersionedNodeType } from 'n8n-workflow';
import { debug } from './debug.js';

const require = createRequire(import.meta.url);
// Load n8n-workflow via CommonJS entrypoint to avoid ESM logger-proxy resolution issues
 
const n8nWorkflowCjs = require('n8n-workflow') as any;
// Use a differently named runtime class to avoid clashing with the type-only VersionedNodeType
const { VersionedNodeType: CjsVersionedNodeType } = n8nWorkflowCjs;

/**
 * Failed load tracking for diagnostics
 * Task 07: Debug Logging for Node Loader Errors
 */
interface FailedLoad {
  path: string;
  error: string;
  type: 'require' | 'instantiate';
}

export class NodeRegistry {
  private nodeTypes: Map<string, any> = new Map();
  private initialized = false;
  private failedLoads: FailedLoad[] = [];

  init() {
    if (this.initialized) {return;}

    let nodesBaseRoot: string;
    try {
      nodesBaseRoot = path.join(
        path.dirname(require.resolve('n8n-nodes-base/package.json')),
        'dist',
        'nodes',
      );
    } catch {
      throw new Error('Could not locate n8n-nodes-base. Please ensure it is installed.');
    }

    this.scanDirectory(nodesBaseRoot);
    this.initialized = true;
  }

  private scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.node.js')) {
        this.loadNodeFile(fullPath);
      }
    }
  }

  private loadNodeFile(filePath: string) {
    try {
       
      const module = require(filePath);
      
      // Iterate exports to find INodeType classes
      for (const key in module) {
        const ExportedClass = module[key];
        // Check if it looks like a class
        if (typeof ExportedClass === 'function' && ExportedClass.prototype) {
          try {
            const instance = new ExportedClass();
            if (instance.description) {
              const {name} = instance.description;
              // Register with and without prefix to be safe
              this.nodeTypes.set(name, instance);
              this.nodeTypes.set(`n8n-nodes-base.${name}`, instance);
            }
          } catch (e) {
            // Task 07: Log instantiation errors in debug mode
            const errorMsg = e instanceof Error ? e.message : String(e);
            debug('loader', `Failed to instantiate ${key} from ${filePath}: ${errorMsg}`);
            this.failedLoads.push({
              path: filePath,
              error: errorMsg,
              type: 'instantiate',
            });
          }
        }
      }
    } catch (e) {
      // Task 07: Log require errors in debug mode
      const errorMsg = e instanceof Error ? e.message : String(e);
      debug('loader', `Failed to require ${filePath}: ${errorMsg}`);
      this.failedLoads.push({
        path: filePath,
        error: errorMsg,
        type: 'require',
      });
    }
  }

  getNodeType(nodeType: string, version?: number): INodeTypeDescription | null {
    const nodeInstance = this.nodeTypes.get(nodeType) as INodeType | VersionedNodeType | undefined;
    if (!nodeInstance) {
      // Task 07: Check if this node type failed to load
      const failedEntry = this.failedLoads.find(f => f.path.includes(nodeType.replace('n8n-nodes-base.', '')));
      if (failedEntry) {
        debug('loader', `Node type ${nodeType} was requested but failed to load: ${failedEntry.error}`);
      }
      return null;
    }

    if (nodeInstance instanceof CjsVersionedNodeType) {
      const vt = nodeInstance as VersionedNodeType;
      const resolvedVersion =
        version ?? (vt.description as any).defaultVersion ?? vt.getLatestVersion();
      const concrete = vt.getNodeType(resolvedVersion);
      return concrete.description;
    }

    return (nodeInstance as INodeType).description;
  }

  /**
   * Get list of load errors for diagnostics
   * Task 07: Expose failed loads for debugging
   */
  getLoadErrors(): FailedLoad[] {
    return [...this.failedLoads];
  }
  
  /**
   * Get count of successfully loaded node types
   */
  getLoadedCount(): number {
    return this.nodeTypes.size;
  }
  
  /**
   * Get count of failed loads
   */
  getFailedCount(): number {
    return this.failedLoads.length;
  }
}

export const nodeRegistry = new NodeRegistry();
