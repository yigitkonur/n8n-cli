/**
 * Source location utilities for mapping JSON paths to line numbers and extracting snippets.
 * Uses jsonc-parser to get AST with source positions.
 */

import { parseTree, Node as JsonNode, findNodeAtLocation } from 'jsonc-parser';
import type { SourceLocation, SourceSnippet } from './types.js';

export interface SourceMap {
  ast: JsonNode | undefined;
  source: string;
  lines: string[];
}

/**
 * Parse JSON source and create a source map for location lookups.
 */
export function createSourceMap(source: string): SourceMap {
  const ast = parseTree(source, undefined, { 
    disallowComments: false,
    allowTrailingComma: true,
    allowEmptyContent: true
  });
  const lines = source.split('\n');
  
  return { ast, source, lines };
}

/**
 * Convert a character offset to line and column numbers (1-indexed).
 * Handles both LF (\n) and CRLF (\r\n) line endings correctly.
 */
export function offsetToLineColumn(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
      column = 1;
    } else if (source[i] === '\r') {
      // Skip \r - it will be followed by \n in CRLF, or standalone \r acts as newline
      if (source[i + 1] !== '\n') {
        line++;
        column = 1;
      }
    } else {
      column++;
    }
  }
  
  return { line, column };
}

/**
 * Parse a JSON path like "nodes[4].parameters.options" into segments.
 */
export function parseJsonPath(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  const regex = /([^.\[\]]+)|\[(\d+)\]/g;
  let match;
  
  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      segments.push(parseInt(match[2], 10));
    }
  }
  
  return segments;
}

/**
 * Find the AST node at a given JSON path and return its source location.
 */
export function findSourceLocation(sourceMap: SourceMap, path: string): SourceLocation | undefined {
  if (!sourceMap.ast) return undefined;
  
  const segments = parseJsonPath(path);
  const node = findNodeAtLocation(sourceMap.ast, segments);
  
  if (!node) return undefined;
  
  const start = offsetToLineColumn(sourceMap.source, node.offset);
  const end = offsetToLineColumn(sourceMap.source, node.offset + node.length);
  
  return {
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
    offset: node.offset,
    length: node.length
  };
}

/**
 * Extract a source snippet around a given line number.
 */
export function extractSnippet(
  sourceMap: SourceMap, 
  targetLine: number, 
  contextLines: number = 3
): SourceSnippet {
  const startLine = Math.max(1, targetLine - contextLines);
  const endLine = Math.min(sourceMap.lines.length, targetLine + contextLines);
  
  const lines: SourceSnippet['lines'] = [];
  
  for (let i = startLine; i <= endLine; i++) {
    lines.push({
      lineNumber: i,
      content: sourceMap.lines[i - 1] || '',
      isHighlighted: i === targetLine
    });
  }
  
  return {
    lines,
    startLine,
    endLine,
    highlightLine: targetLine
  };
}

/**
 * Get the raw source text for a given JSON path.
 */
export function getSourceText(sourceMap: SourceMap, path: string): string | undefined {
  if (!sourceMap.ast) return undefined;
  
  const segments = parseJsonPath(path);
  const node = findNodeAtLocation(sourceMap.ast, segments);
  
  if (!node) return undefined;
  
  return sourceMap.source.substring(node.offset, node.offset + node.length);
}

/**
 * Get a pretty-printed version of the value at a JSON path (for display).
 */
export function getFormattedValue(sourceMap: SourceMap, path: string, maxLength: number = 500): string | undefined {
  const text = getSourceText(sourceMap, path);
  if (!text) return undefined;
  
  // Try to parse and re-format for consistent display
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    if (formatted.length > maxLength) {
      return formatted.substring(0, maxLength) + '\n... (truncated)';
    }
    return formatted;
  } catch {
    // Return raw text if not valid JSON
    return text.length > maxLength ? text.substring(0, maxLength) + '... (truncated)' : text;
  }
}
