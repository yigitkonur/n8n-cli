// Theme and icons
export { theme, icons, formatStatus, formatBoolean } from './theme.js';

// Header formatting
export { formatHeader, formatDivider, formatTitle } from './header.js';
export type { HeaderOptions } from './header.js';

// Table formatting
export { formatTable, columnFormatters } from './table.js';
export type { TableColumn, TableOptions } from './table.js';

// Summary statistics
export { formatSummary, formatHealthIndicator } from './summary.js';
export type { SummaryStats } from './summary.js';

// Next actions
export { formatNextActions, generateNextActions, formatJqSuggestion } from './next-actions.js';
export type { NextAction } from './next-actions.js';

// jq recipes
export { formatJqRecipes, getStandardRecipes } from './jq-recipes.js';
export type { JqRecipe } from './jq-recipes.js';

// JSON output
export { saveToJson, formatBytes, outputJson, formatJsonResponse } from './json.js';
export type { JsonOutputOptions } from './json.js';

// Tree formatting
export {
  formatAlphaTree,
  formatCategoryTree,
  formatSimpleTree,
  formatOperationsTree,
  formatCategoryStats,
  formatAuthMethodTree,
  renderTreeBranch,
  CATEGORY_META,
} from './tree.js';
export type { TreeItem, TreeOptions, CategoryMeta } from './tree.js';
