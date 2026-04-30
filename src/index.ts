import { rules } from './rules/index';

import { name, version } from '../package.json';

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
