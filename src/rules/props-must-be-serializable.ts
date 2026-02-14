import { ESLintUtils, TSESTree, type TSESLint } from '@typescript-eslint/utils';
import ts from 'typescript';
import { createRule } from '../utils';

type MessageIds = 'functionNotServerAction' | 'invalidProp';
type Options = [];

export const propsMustBeSerializable = createRule<Options, MessageIds>({
  name: 'props-must-be-serializable',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce serializable props in Next.js "use client" components',
    },
    messages: {
      functionNotServerAction:
        'Props must be serializable for components in the "use client" entry file. "{{propName}}" is a function that\'s not a Server Action.\nRename "{{propName}}" either to "action" or have its name end with "Action" e.g. "{{propName}}Action" to indicate it is a Server Action.',
      invalidProp:
        'Props must be serializable for components in the "use client" entry file, "{{propName}}" is invalid.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;
    const sourceCode = context.sourceCode;

    // Skip test files
    if (/\.(test|spec)\.[jt]sx?$/.test(filename)) {
      return {};
    }

    let hasUseClientDirective = false;

    return {
      Program(node) {
        // Check if the first statement is 'use client' directive
        if (node.body.length > 0) {
          const firstStatement = node.body[0];
          if (
            firstStatement.type === 'ExpressionStatement' &&
            firstStatement.expression.type === 'Literal' &&
            firstStatement.expression.value === 'use client'
          ) {
            hasUseClientDirective = true;
          }
        }
      },

      ExportDefaultDeclaration(node) {
        if (!hasUseClientDirective) return;

        let functionNode:
          | TSESTree.FunctionDeclaration
          | TSESTree.ArrowFunctionExpression
          | null = null;

        if (node.declaration.type === 'FunctionDeclaration') {
          functionNode = node.declaration;
        } else if (node.declaration.type === 'Identifier') {
          // Handle: const Comp = () => {}; export default Comp;
          // We need to find the variable declaration
          const variable = findVariableDeclaration(
            node.declaration.name,
            sourceCode.ast
          );
          if (variable && variable.init) {
            if (variable.init.type === 'ArrowFunctionExpression') {
              functionNode = variable.init;
            }
          }
        } else if (node.declaration.type === 'ArrowFunctionExpression') {
          functionNode = node.declaration;
        }

        if (functionNode) {
          validateComponentProps(functionNode, context, filename);
        }
      },

      ExportNamedDeclaration(node) {
        if (!hasUseClientDirective) return;

        // Handle: export function Component() {}
        if (node.declaration?.type === 'FunctionDeclaration') {
          validateComponentProps(node.declaration, context, filename);
        }
        // Handle: export const Component = () => {} or export const Component = function() {}
        else if (node.declaration?.type === 'VariableDeclaration') {
          for (const declarator of node.declaration.declarations) {
            if (declarator.init) {
              if (
                declarator.init.type === 'ArrowFunctionExpression' ||
                declarator.init.type === 'FunctionExpression'
              ) {
                validateComponentProps(declarator.init, context, filename);
              }
            }
          }
        }
        // Handle: export { Component }
        else if (node.specifiers.length > 0) {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === 'ExportSpecifier' &&
              specifier.local.type === 'Identifier'
            ) {
              const variable = findVariableDeclaration(
                specifier.local.name,
                sourceCode.ast
              );
              if (variable && variable.init) {
                if (variable.init.type === 'ArrowFunctionExpression') {
                  validateComponentProps(variable.init, context, filename);
                } else if (variable.init.type === 'FunctionExpression') {
                  validateComponentProps(variable.init, context, filename);
                }
              }
            }
          }
        }
      },
    };
  },
});

function findVariableDeclaration(
  name: string,
  program: TSESTree.Program
): TSESTree.VariableDeclarator | null {
  for (const statement of program.body) {
    if (statement.type === 'VariableDeclaration') {
      for (const declarator of statement.declarations) {
        if (
          declarator.id.type === 'Identifier' &&
          declarator.id.name === name
        ) {
          return declarator;
        }
      }
    }
  }
  return null;
}

function validateComponentProps(
  functionNode:
    | TSESTree.FunctionDeclaration
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
  filename: string
) {
  if (functionNode.params.length === 0) {
    return;
  }

  const propsParam = functionNode.params[0];

  // Support both regular props and destructured props
  // e.g., (props: Props) or ({ action, onClick }: Props)
  if (propsParam.type !== 'Identifier' && propsParam.type !== 'ObjectPattern') {
    return;
  }

  const services = ESLintUtils.getParserServices(context);
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(propsParam);

  // Defensive check: tsNode should always exist but guard against edge cases
  if (!tsNode) {
    return;
  }

  const type = checker.getTypeAtLocation(tsNode);

  const properties = type.getProperties();
  for (const prop of properties) {
    const propName = prop.getName();
    const propType = checker.getTypeOfSymbolAtLocation(prop, tsNode);

    if (isFunctionType(propType, checker)) {
      // Allow if propName is 'action' or ends with 'Action'. See reference
      // implementation for more information:
      // https://github.com/vercel/next.js/blob/canary/packages/next/src/server/typescript/rules/client-boundary.ts
      if (propName === 'action' || /Action$/.test(propName)) {
        continue;
      }

      // Allow 'reset' in error files, see Next. See reference implementation
      // for more information:
      // https://github.com/vercel/next.js/blob/canary/packages/next/src/server/typescript/rules/client-boundary.ts
      if (
        propName === 'reset' &&
        /[\\/](global-)?error\.tsx?$/.test(filename)
      ) {
        continue;
      }

      reportInvalidProp(
        prop,
        propName,
        'functionNotServerAction',
        services,
        context
      );
    } else if (isClassType(propType, checker)) {
      reportInvalidProp(prop, propName, 'invalidProp', services, context);
    }
  }
}

function reportInvalidProp(
  prop: ts.Symbol,
  propName: string,
  messageId: MessageIds,
  services: ReturnType<typeof ESLintUtils.getParserServices>,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): void {
  const propDeclaration = prop.valueDeclaration;
  if (propDeclaration) {
    const propNode = services.tsNodeToESTreeNodeMap.get(propDeclaration);
    if (propNode) {
      context.report({
        node: propNode,
        messageId,
        data: {
          propName,
        },
      });
    }
  }
}

function isFunctionType(type: ts.Type, checker: ts.TypeChecker): boolean {
  const signatures = type.getCallSignatures();
  if (signatures.length > 0) {
    return true;
  }

  if (type.isUnion()) {
    return type.types.some(t => isFunctionType(t, checker));
  }

  if (type.isIntersection()) {
    return type.types.some(t => isFunctionType(t, checker));
  }

  return false;
}

// Built-in types that are serializable in React Server Components
// Based on: https://react.dev/reference/rsc/use-client#serializable-types
// Includes types from the Structured Clone Algorithm
const SERIALIZABLE_BUILT_INS = new Set([
  'Date',
  'Map',
  'Set',
  'Promise',
  'RegExp',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'ArrayBuffer',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'DataView',
  'Blob',
  'File',
  'FileList',
  'ImageData',
  'ImageBitmap',
  'Array',
  'Object',
]);

function isClassType(type: ts.Type, checker: ts.TypeChecker): boolean {
  // Check if it's a constructor type (typeof Class)
  const constructSignatures = type.getConstructSignatures();
  if (constructSignatures.length > 0) {
    // Check if it's a built-in serializable type
    if (isSerializableBuiltIn(type)) {
      return false;
    }
    return true;
  }

  // Check if it's a class instance type
  const symbol = type.getSymbol();
  if (symbol) {
    const declarations = symbol.getDeclarations();
    if (declarations) {
      for (const declaration of declarations) {
        if (ts.isClassDeclaration(declaration)) {
          // Check if it's a built-in serializable type
          if (isSerializableBuiltIn(type)) {
            return false;
          }
          return true;
        }
      }
    }
  }

  if (type.isUnion()) {
    return type.types.some(t => isClassType(t, checker));
  }

  if (type.isIntersection()) {
    return type.types.some(t => isClassType(t, checker));
  }

  return false;
}

function isSerializableBuiltIn(type: ts.Type): boolean {
  const symbol = type.getSymbol();
  if (!symbol) {
    return false;
  }

  const name = symbol.getName();
  return SERIALIZABLE_BUILT_INS.has(name);
}
