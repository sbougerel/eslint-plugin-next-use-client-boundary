import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/sbougerel/eslint-plugin-next-use-client-boundary/blob/main/docs/rules/${name}.md`
);
