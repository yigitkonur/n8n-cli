import { parse as esprimaParse, Syntax, type Node as SyntaxNode, type ExpressionStatement } from 'esprima-next';
import { jsonrepair } from 'jsonrepair';

// Limits to prevent DoS attacks
const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_NESTING_DEPTH = 100;

interface JSONParseOptions<T> {
  acceptJSObject?: boolean;
  repairJSON?: boolean;
  errorMessage?: string;
  fallbackValue?: T;
}

function syntaxNodeToValue(expression?: SyntaxNode | null, depth = 0): unknown {
  if (depth > MAX_NESTING_DEPTH) {
    throw new Error(`JSON nesting exceeds maximum depth of ${MAX_NESTING_DEPTH}`);
  }
  
  switch (expression?.type) {
    case Syntax.ObjectExpression:
      return Object.fromEntries(
        expression.properties
          .filter((prop) => prop.type === Syntax.Property)
          .map(({ key, value }) => [syntaxNodeToValue(key, depth + 1), syntaxNodeToValue(value, depth + 1)]),
      );
    case Syntax.Identifier:
      return expression.name;
    case Syntax.Literal:
      return expression.value;
    case Syntax.ArrayExpression:
      return expression.elements.map((exp) => syntaxNodeToValue(exp, depth + 1));
    default:
      return undefined;
  }
}

function parseJSObject(objectAsString: string): object {
  const jsExpression = esprimaParse(`(${objectAsString})`).body.find(
    (node): node is ExpressionStatement =>
      node.type === Syntax.ExpressionStatement && node.expression.type === Syntax.ObjectExpression,
  );

  return syntaxNodeToValue(jsExpression?.expression) as object;
}

export function jsonParse<T>(jsonString: string, options?: JSONParseOptions<T>): T {
  // Size limit check to prevent DoS
  if (jsonString.length > MAX_JSON_SIZE) {
    throw new Error(`JSON input exceeds maximum size of ${MAX_JSON_SIZE / 1024 / 1024}MB`);
  }
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (options?.acceptJSObject) {
      try {
        const jsonStringCleaned = parseJSObject(jsonString);
        return jsonStringCleaned as T;
      } catch {
        // JS object parsing failed, continue to next strategy
      }
    }
    if (options?.repairJSON) {
      try {
        const jsonStringCleaned = jsonrepair(jsonString);
        return JSON.parse(jsonStringCleaned) as T;
      } catch {
        // JSON repair failed, continue to fallback
      }
    }
    if (options?.fallbackValue !== undefined) {
      if (options.fallbackValue instanceof Function) {
        return options.fallbackValue();
      }
      return options.fallbackValue;
    } else if (options?.errorMessage) {
      throw new Error(options.errorMessage);
    }

    throw error;
  }
}
