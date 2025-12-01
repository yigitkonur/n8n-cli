/**
 * Breaking Change Detector
 *
 * Detects breaking changes between node versions using the registry.
 * Simplified from MCP version - CLI uses registry-only approach (no DB version tables).
 *
 * Adapted from n8n-mcp/src/services/breaking-change-detector.ts
 */

import type { DetectedChange, VersionUpgradeAnalysis, Severity } from './types.js';
import { getAllChangesForNode, getBreakingChangesForNode } from './breaking-changes-registry.js';

/**
 * Breaking Change Detector
 * 
 * Analyzes version upgrades to detect breaking changes and generate recommendations.
 * Uses the hardcoded registry for CLI (no database queries needed).
 */
export class BreakingChangeDetector {
  /**
   * Analyze a version upgrade and detect all changes
   */
  analyzeVersionUpgrade(
    nodeType: string,
    fromVersion: string,
    toVersion: string
  ): VersionUpgradeAnalysis {
    // Get changes from registry
    const registryChanges = this.getRegistryChanges(nodeType, fromVersion, toVersion);

    // Calculate statistics
    const hasBreakingChanges = registryChanges.some(c => c.isBreaking);
    const autoMigratableCount = registryChanges.filter(c => c.autoMigratable).length;
    const manualRequiredCount = registryChanges.filter(c => !c.autoMigratable).length;

    // Determine overall severity
    const overallSeverity = this.calculateOverallSeverity(registryChanges);

    // Generate recommendations
    const recommendations = this.generateRecommendations(registryChanges);

    return {
      nodeType,
      fromVersion,
      toVersion,
      hasBreakingChanges,
      changes: registryChanges,
      autoMigratableCount,
      manualRequiredCount,
      overallSeverity,
      recommendations
    };
  }

  /**
   * Get changes from the hardcoded registry
   */
  getRegistryChanges(
    nodeType: string,
    fromVersion: string,
    toVersion: string
  ): DetectedChange[] {
    const registryChanges = getAllChangesForNode(nodeType, fromVersion, toVersion);

    return registryChanges.map(change => ({
      propertyName: change.propertyName,
      changeType: change.changeType,
      isBreaking: change.isBreaking,
      oldValue: change.oldValue,
      newValue: change.newValue,
      migrationHint: change.migrationHint,
      autoMigratable: change.autoMigratable,
      migrationStrategy: change.migrationStrategy,
      severity: change.severity,
      source: 'registry' as const
    }));
  }

  /**
   * Calculate overall severity of the upgrade
   */
  private calculateOverallSeverity(changes: DetectedChange[]): Severity {
    if (changes.some(c => c.severity === 'HIGH')) {return 'HIGH';}
    if (changes.some(c => c.severity === 'MEDIUM')) {return 'MEDIUM';}
    return 'LOW';
  }

  /**
   * Generate actionable recommendations for the upgrade
   */
  private generateRecommendations(changes: DetectedChange[]): string[] {
    const recommendations: string[] = [];

    const breakingChanges = changes.filter(c => c.isBreaking);
    const autoMigratable = changes.filter(c => c.autoMigratable);
    const manualRequired = changes.filter(c => !c.autoMigratable);

    if (breakingChanges.length === 0) {
      recommendations.push('✓ No breaking changes detected. This upgrade should be safe.');
    } else {
      recommendations.push(
        `⚠ ${breakingChanges.length} breaking change(s) detected. Review carefully before applying.`
      );
    }

    if (autoMigratable.length > 0) {
      recommendations.push(
        `✓ ${autoMigratable.length} change(s) can be automatically migrated.`
      );
    }

    if (manualRequired.length > 0) {
      recommendations.push(
        `✋ ${manualRequired.length} change(s) require manual intervention.`
      );

      // List specific manual changes
      for (const change of manualRequired) {
        recommendations.push(`  - ${change.propertyName}: ${change.migrationHint}`);
      }
    }

    return recommendations;
  }

  /**
   * Quick check: does this upgrade have breaking changes?
   */
  hasBreakingChanges(nodeType: string, fromVersion: string, toVersion: string): boolean {
    const registryChanges = getBreakingChangesForNode(nodeType, fromVersion, toVersion);
    return registryChanges.length > 0;
  }

  /**
   * Get simple list of property names that changed
   */
  getChangedProperties(nodeType: string, fromVersion: string, toVersion: string): string[] {
    const registryChanges = getAllChangesForNode(nodeType, fromVersion, toVersion);
    return registryChanges.map(c => c.propertyName);
  }
}
