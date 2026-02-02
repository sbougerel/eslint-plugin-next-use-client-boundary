import rules from './rules';

const plugin = {
  meta: {
    name: '@sbougerel/eslint-plugin-next-use-client-boundary',
    version: '0.1.0',
  },
  rules,
  configs: {
    recommended: {
      plugins: ['@sbougerel/next-use-client-boundary'],
      rules: {
        '@sbougerel/next-use-client-boundary/props-must-be-serializable': 'error',
      },
    },
    'recommended-type-checked': {
      plugins: ['@sbougerel/next-use-client-boundary'],
      rules: {
        '@sbougerel/next-use-client-boundary/props-must-be-serializable': 'error',
      },
    },
  },
};

export { rules };
export default plugin;
