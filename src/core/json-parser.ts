import { parse as esprimaParse, Syntax } from 'esprima-next';
import type { Node as SyntaxNode, ExpressionStatement } from 'esprima-next';
import { jsonrepair } from 'jsonrepair';

interface JSONParseOptions<T> {
  acceptJSObject?: boolean;
  repairJSON?: boolean;
  errorMessage?: string;
  fallbackValue?: T;
}

function syntaxNodeToValue(expression?: SyntaxNode | null): unknown {
  switch (expression?.type) {
    case Syntax.ObjectExpression:
      return Object.fromEntries(
        expression.properties
          .filter((prop) => prop.type === Syntax.Property)
          .map(({ key, value }) => [syntaxNodeToValue(key), syntaxNodeToValue(value)]),
      );
    case Syntax.Identifier:
      return expression.name;
    case Syntax.Literal:
      return expression.value;
    case Syntax.ArrayExpression:
      return expression.elements.map((exp) => syntaxNodeToValue(exp));
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
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (options?.acceptJSObject) {
      try {
        const jsonStringCleaned = parseJSObject(jsonString);
        return jsonStringCleaned as T;
      } catch (e) {
      }
    }
    if (options?.repairJSON) {
      try {
        const jsonStringCleaned = jsonrepair(jsonString);
        return JSON.parse(jsonStringCleaned) as T;
      } catch (e) {
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
