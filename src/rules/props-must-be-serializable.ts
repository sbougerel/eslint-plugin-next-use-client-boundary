import { ESLintUtils, TSESTree, type TSESLint } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { createRule } from '../utils';

type MessageIds = 'functionNotServerAction' | 'invalidProp';
type Options = [];

export default createRule<Options, MessageIds>({
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
        // Handle: export const Component = () => {}
        else if (node.declaration?.type === 'VariableDeclaration') {
          for (const declarator of node.declaration.declarations) {
            if (
              declarator.init &&
              declarator.init.type === 'ArrowFunctionExpression'
            ) {
              validateComponentProps(declarator.init, context, filename);
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

      const propDeclaration = prop.valueDeclaration;
      if (propDeclaration) {
        const propNode = services.tsNodeToESTreeNodeMap.get(propDeclaration);
        if (propNode) {
          context.report({
            node: propNode,
            messageId: 'functionNotServerAction',
            data: {
              propName,
            },
          });
        }
      }
    } else if (isClassType(propType, checker)) {
      const propDeclaration = prop.valueDeclaration;
      if (propDeclaration) {
        const propNode = services.tsNodeToESTreeNodeMap.get(propDeclaration);
        if (propNode) {
          context.report({
            node: propNode,
            messageId: 'invalidProp',
            data: {
              propName,
            },
          });
        }
      }
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

  return false;
}

function isClassType(type: ts.Type, checker: ts.TypeChecker): boolean {
  const constructSignatures = type.getConstructSignatures();
  if (constructSignatures.length > 0) {
    return true;
  }

  const symbol = type.getSymbol();
  if (symbol) {
    const declarations = symbol.getDeclarations();
    if (declarations) {
      for (const declaration of declarations) {
        if (ts.isClassDeclaration(declaration)) {
          return true;
        }
      }
    }
  }

  if (type.isUnion()) {
    return type.types.some(t => isClassType(t, checker));
  }

  return false;
}
