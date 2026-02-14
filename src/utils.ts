import { ESLintUtils } from '@typescript-eslint/utils';

export interface NextUseClientBoundaryDoc {
  description: string;
  recommended?: boolean;
  requiresTypeChecking?: boolean;
}

export const createRule = ESLintUtils.RuleCreator<NextUseClientBoundaryDoc>(
  name =>
    `https://github.com/sbougerel/eslint-plugin-next-use-client-boundary/blob/main/docs/rules/${name}.md`
);
