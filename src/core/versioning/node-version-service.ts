/**
 * Node Version Service
 *
 * Central service for node version discovery, comparison, and upgrade path recommendation.
 * Simplified for CLI - uses registry-based version tracking (no DB version tables).
 *
 * Adapted from n8n-mcp/src/services/node-version-service.ts
 */

import type { VersionComparison, UpgradePath, UpgradeStep, NodeVersion } from './types.js';
import { BreakingChangeDetector } from './breaking-change-detector.js';
import {
  compareVersions,
  getTrackedVersionsForNode,
  getLatestRegistryVersion,
  getNodesWithVersionMigrations,
} from './breaking-changes-registry.js';

/**
 * Node Version Service
 * 
 * Provides version analysis and upgrade path recommendations using the registry.
 */
export class NodeVersionService {
  private breakingChangeDetector: BreakingChangeDetector;

  constructor(breakingChangeDetector?: BreakingChangeDetector) {
    this.breakingChangeDetector = breakingChangeDetector || new BreakingChangeDetector();
  }

  /**
   * Get all tracked versions for a node type from the registry
   */
  getAvailableVersions(nodeType: string): string[] {
    return getTrackedVersionsForNode(nodeType);
  }

  /**
   * Get the latest known version for a node type
   */
  getLatestVersion(nodeType: string): string | null {
    return getLatestRegistryVersion(nodeType);
  }

  /**
   * Compare two version strings numerically
   */
  compareVersions(currentVersion: string, latestVersion: string): number {
    return compareVersions(currentVersion, latestVersion);
  }

  /**
   * Analyze if a node version is outdated and should be upgraded
   */
  analyzeVersion(nodeType: string, currentVersion: string): VersionComparison {
    const latestVersion = this.getLatestVersion(nodeType);

    // No registry info for this node
    if (!latestVersion) {
      return {
        nodeType,
        currentVersion,
        latestVersion: currentVersion,
        isOutdated: false,
        versionGap: 0,
        hasBreakingChanges: false,
        recommendUpgrade: false,
        confidence: 'HIGH',
        reason: 'No version information available in registry. Node may be custom or community.'
      };
    }

    const comparison = this.compareVersions(currentVersion, latestVersion);
    const isOutdated = comparison < 0;

    if (!isOutdated) {
      return {
        nodeType,
        currentVersion,
        latestVersion,
        isOutdated: false,
        versionGap: 0,
        hasBreakingChanges: false,
        recommendUpgrade: false,
        confidence: 'HIGH',
        reason: 'Node is at or above the latest tracked version.'
      };
    }

    // Calculate version gap
    const versionGap = this.calculateVersionGap(currentVersion, latestVersion);

    // Check for breaking changes
    const hasBreakingChanges = this.breakingChangeDetector.hasBreakingChanges(
      nodeType,
      currentVersion,
      latestVersion
    );

    // Determine upgrade recommendation and confidence
    let recommendUpgrade = true;
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    let reason = `Version ${latestVersion} available. `;

    if (hasBreakingChanges) {
      confidence = 'MEDIUM';
      reason += 'Contains breaking changes. Review before upgrading.';
    } else {
      reason += 'Safe to upgrade (no breaking changes detected).';
    }

    if (versionGap > 2) {
      confidence = 'LOW';
      reason += ` Version gap is large (${versionGap} versions). Consider incremental upgrade.`;
    }

    return {
      nodeType,
      currentVersion,
      latestVersion,
      isOutdated,
      versionGap,
      hasBreakingChanges,
      recommendUpgrade,
      confidence,
      reason
    };
  }

  /**
   * Calculate the version gap (rough estimate based on version numbers)
   */
  private calculateVersionGap(fromVersion: string, toVersion: string): number {
    const from = fromVersion.split('.').map(Number);
    const to = toVersion.split('.').map(Number);

    // Simple gap calculation based on version numbers
    let gap = 0;

    for (let i = 0; i < Math.max(from.length, to.length); i++) {
      const f = from[i] || 0;
      const t = to[i] || 0;
      gap += Math.abs(t - f);
    }

    return gap;
  }

  /**
   * Suggest the best upgrade path for a node
   */
  suggestUpgradePath(nodeType: string, currentVersion: string): UpgradePath | null {
    const latestVersion = this.getLatestVersion(nodeType);

    if (!latestVersion) return null;

    const comparison = this.compareVersions(currentVersion, latestVersion);
    if (comparison >= 0) return null; // Already at latest or newer

    // Get all available versions between current and latest
    const allVersions = this.getAvailableVersions(nodeType);
    const intermediateVersions = allVersions
      .filter(v =>
        this.compareVersions(v, currentVersion) > 0 &&
        this.compareVersions(v, latestVersion) < 0
      )
      .sort((a, b) => this.compareVersions(a, b));

    // Analyze the upgrade
    const analysis = this.breakingChangeDetector.analyzeVersionUpgrade(
      nodeType,
      currentVersion,
      latestVersion
    );

    // Determine if direct upgrade is safe
    const versionGap = this.calculateVersionGap(currentVersion, latestVersion);
    const direct = versionGap <= 1 || !analysis.hasBreakingChanges;

    // Generate upgrade steps
    const steps: UpgradeStep[] = [];

    if (direct || intermediateVersions.length === 0) {
      // Direct upgrade
      steps.push({
        fromVersion: currentVersion,
        toVersion: latestVersion,
        breakingChanges: analysis.changes.filter(c => c.isBreaking).length,
        migrationHints: analysis.recommendations
      });
    } else {
      // Multi-step upgrade through intermediate versions
      let stepFrom = currentVersion;

      for (const intermediateVersion of intermediateVersions) {
        const stepAnalysis = this.breakingChangeDetector.analyzeVersionUpgrade(
          nodeType,
          stepFrom,
          intermediateVersion
        );

        steps.push({
          fromVersion: stepFrom,
          toVersion: intermediateVersion,
          breakingChanges: stepAnalysis.changes.filter(c => c.isBreaking).length,
          migrationHints: stepAnalysis.recommendations
        });

        stepFrom = intermediateVersion;
      }

      // Final step to latest
      const finalStepAnalysis = this.breakingChangeDetector.analyzeVersionUpgrade(
        nodeType,
        stepFrom,
        latestVersion
      );

      steps.push({
        fromVersion: stepFrom,
        toVersion: latestVersion,
        breakingChanges: finalStepAnalysis.changes.filter(c => c.isBreaking).length,
        migrationHints: finalStepAnalysis.recommendations
      });
    }

    // Calculate estimated effort
    const totalBreakingChanges = steps.reduce((sum, step) => sum + step.breakingChanges, 0);
    let estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (totalBreakingChanges > 5 || steps.length > 3) {
      estimatedEffort = 'HIGH';
    } else if (totalBreakingChanges > 2 || steps.length > 1) {
      estimatedEffort = 'MEDIUM';
    }

    return {
      nodeType,
      fromVersion: currentVersion,
      toVersion: latestVersion,
      direct,
      intermediateVersions,
      totalBreakingChanges,
      autoMigratableChanges: analysis.autoMigratableCount,
      manualRequiredChanges: analysis.manualRequiredCount,
      estimatedEffort,
      steps
    };
  }

  /**
   * Check if a specific version exists in the registry
   */
  versionExists(nodeType: string, version: string): boolean {
    const versions = this.getAvailableVersions(nodeType);
    return versions.includes(version);
  }

  /**
   * Get list of all nodes with known version migrations
   */
  getNodesWithMigrations(): string[] {
    return getNodesWithVersionMigrations();
  }

  /**
   * Check if a node type is in the registry
   */
  isNodeTracked(nodeType: string): boolean {
    return this.getAvailableVersions(nodeType).length > 0;
  }

  /**
   * Build version info for display (simplified for CLI)
   */
  buildVersionInfo(nodeType: string): Array<{
    nodeType: string;
    version: string;
    packageName: string;
    displayName: string;
    isCurrentMax: boolean;
    hasBreakingChanges: boolean;
    breakingChangeCount: number;
    addedProperties: string[];
  }> {
    const versions = this.getAvailableVersions(nodeType);
    const latestVersion = this.getLatestVersion(nodeType);

    return versions.map(version => {
      const nextVersion = versions[versions.indexOf(version) + 1];
      const analysis = nextVersion 
        ? this.breakingChangeDetector.analyzeVersionUpgrade(nodeType, version, nextVersion)
        : null;

      return {
        nodeType,
        version,
        packageName: 'n8n-nodes-base',
        displayName: nodeType.split('.').pop() || nodeType,
        isCurrentMax: version === latestVersion,
        hasBreakingChanges: analysis?.hasBreakingChanges ?? false,
        breakingChangeCount: analysis?.changes.filter(c => c.isBreaking).length ?? 0,
        addedProperties: analysis?.changes
          .filter(c => c.changeType === 'added')
          .map(c => c.propertyName) ?? [],
      };
    });
  }
}
