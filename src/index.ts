import { rules } from './rules/index';

const { name, version } =
  // `import`ing here would bypass the TSConfig's `"rootDir": "src"`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../package.json') as typeof import('../package.json');

const plugin = {
  configs: {
    get recommended() {
      return recommended;
    },
  },
  meta: { name, version },
  rules,
};

const recommended = {
  plugins: {
    '@sbougerel/next-use-client-boundary': plugin,
  },
  rules: {
    '@sbougerel/next-use-client-boundary/props-must-be-serializable': 'error',
  },
};

export = plugin;
