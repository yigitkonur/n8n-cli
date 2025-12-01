/**
 * Node Detail Mode Types
 * 
 * Type definitions for the enhanced nodes show command with
 * detail levels and operation modes.
 */

import type { SimplifiedProperty } from '../core/services/property-filter.js';

/**
 * Detail levels for node information
 */
export type DetailLevel = 'minimal' | 'standard' | 'full';

/**
 * Operation modes for nodes show command
 */
export type NodeShowMode = 
  | 'info'              // Node configuration schema (default)
  | 'docs'              // Markdown documentation
  | 'search-properties' // Find properties by query
  | 'versions'          // Complete version history
  | 'compare'           // Property diff between versions
  | 'breaking'          // Breaking changes only
  | 'migrations';       // Auto-migratable changes

/**
 * Extended options for nodes show command
 */
export interface ShowOptions {
  // Detail levels
  detail?: DetailLevel;
  
  // Operation modes
  mode?: NodeShowMode;
  
  // Mode-specific parameters
  query?: string;           // For search-properties
  from?: string;            // For compare/breaking/migrations
  to?: string;              // For compare/breaking/migrations
  maxResults?: number;      // For search-properties (default: 20)
  
  // Include options
  includeTypeInfo?: boolean;
  includeExamples?: boolean;
  
  // Output options
  save?: string;
  json?: boolean;
  
  // Legacy flags (deprecated, map to new options)
  schema?: boolean;         // → detail: 'full'
  minimal?: boolean;        // → detail: 'minimal'
  examples?: boolean;       // → includeExamples: true
}

/**
 * Minimal node info (~200 tokens)
 */
export interface NodeMinimalInfo {
  nodeType: string;
  workflowNodeType: string;
  displayName: string;
  description: string;
  category: string;
  package: string;
  isAITool: boolean;
  isTrigger: boolean;
  isWebhook: boolean;
}

/**
 * Standard node info (~1-2K tokens)
 */
export interface NodeStandardInfo extends NodeMinimalInfo {
  requiredProperties: SimplifiedProperty[];
  commonProperties: SimplifiedProperty[];
  operations: Record<string, string[]>;
  credentials: any[];
  versionInfo?: VersionSummary;
  examples?: NodeExamples;
}

/**
 * Full node info (~3-8K tokens)
 */
export interface NodeFullInfo extends NodeMinimalInfo {
  properties: any[];
  operations: any[];
  credentials: any[];
  versionInfo?: VersionSummary;
  isVersioned: boolean;
  version: string;
  outputs?: any;
  outputNames?: any;
}

/**
 * Version summary included in info responses
 */
export interface VersionSummary {
  currentVersion: string;
  totalVersions: number;
  hasVersionHistory: boolean;
}

/**
 * Node examples for includeExamples option
 */
export interface NodeExamples {
  minimal: Record<string, any>;
  common?: Record<string, any>;
  advanced?: Record<string, any>;
}

/**
 * Property search result
 */
export interface PropertySearchResult {
  nodeType: string;
  query: string;
  matches: SimplifiedProperty[];
  totalMatches: number;
}

/**
 * Version history response
 */
export interface VersionHistoryInfo {
  nodeType: string;
  totalVersions: number;
  versions: VersionEntry[];
  latestVersion: string;
}

/**
 * Single version entry
 */
export interface VersionEntry {
  version: string;
  isCurrent: boolean;
  breakingChanges: string[];
  deprecatedProperties: string[];
  addedProperties: string[];
  releasedAt?: string;
}

/**
 * Version comparison response
 */
export interface VersionComparisonInfo {
  nodeType: string;
  fromVersion: string;
  toVersion: string;
  changes: PropertyChange[];
  breakingChanges: BreakingChange[];
}

/**
 * Property change in version comparison
 */
export interface PropertyChange {
  type: 'added' | 'removed' | 'deprecated' | 'modified';
  property: string;
  version: string;
  details?: string;
}

/**
 * Breaking change in version comparison
 */
export interface BreakingChange {
  property: string;
  description: string;
  version: string;
  migration?: string;
}

/**
 * Union type for all possible node info responses
 */
export type NodeInfoResponse = 
  | NodeMinimalInfo 
  | NodeStandardInfo 
  | NodeFullInfo 
  | VersionHistoryInfo 
  | VersionComparisonInfo
  | PropertySearchResult;
