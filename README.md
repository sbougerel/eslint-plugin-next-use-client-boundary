# eslint-plugin-next-use-client-boundary

A Typescript ESLint plugin for Next.js projects checking that component entries in `'use client'` modules have serializable properties. This rule aims to emulate the Next.js Typescript server rule [reference implemention here](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/typescript/rules/client-boundary.ts).

## Description

In Next.js applications, React components can be exported from modules that start with `'use client'` directive.

## Installation

```bash
npm install --save-dev @sbougerel/eslint-plugin-next-use-client-boundary
# or
yarn add --dev @serviceup/eslint-plugin-next-use-client-boundary
# or
pnpm add --save-dev @serviceup/eslint-plugin-next-use-client-boundary
```

## Usage

This plugin requires TypeScript type information to function properly. Add to your ESLint configuration:

```javascript
// eslint.config.js (ESLint 9+)
import nextUseClientBoundary from '@sbougerel/eslint-plugin-next-use-client-boundary';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  nextUseClientBoundary.configs['recommended-type-checked']
);
```

**Note:** This plugin only provides a `recommended-type-checked` configuration because the rule requires TypeScript's type checker to analyze prop types. See the [TypeScript ESLint typed linting documentation](https://typescript-eslint.io/getting-started/typed-linting/) for more information on setting up type-aware linting.

## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
☑️ Set in the `recommended-type-checked` configuration.

| Name                                                                   | Description                                                   | 💼 |
| :--------------------------------------------------------------------- | :------------------------------------------------------------ | :- |
| [props-must-be-serializable](docs/rules/props-must-be-serializable.md) | Enforce serializable props in Next.js "use client" components | ☑️ |

<!-- end auto-generated rules list -->

This plugin provides one rule:

### props-must-be-serializable

React component entries in `'use client'` modules have serializiable properties.

The types that are not supported in [https://react.dev/reference/rsc/use-client#serializable-types](React `'use client'` reference on serializable types) will fail the rule:

> - Functions that are not exported from client-marked modules or marked with 'use server'
> - Classes
> - Objects that are instances of any class (other than the built-ins mentioned) or objects with a null prototype
> - Symbols not registered globally, ex. Symbol('my new symbol')

Nextjs' reference implementation for this plugin has some differences:

- If a function's name is `action` or ends in `Action`, the rule will pass,
- If a function's name is `reset` and the file name is an error file or a global error file, the rule will pass,
- Symbols that are not registered globally will not fail the rule.

## Configuration

The rule automatically skips test files (files with names containing `.test.` or `.spec.`).

## Known Limitations

- **Nested scope exports**: The rule only searches for variable declarations in the top-level program scope. Variables declared in nested scopes (like within block statements) and then exported are not validated. This pattern is extremely rare in practice:

  ```typescript
  'use client';
  {
    const Component = (props: Props) => {}; // Not validated
    export { Component };
  }
  ```

## Requirements

- ESLint 9.0.0 or higher
- Next.js 14.0.0 or higher

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Development

### Running Tests

After cloning the repository and installing dependencies:

```bash
npm install
npm test
```

The tests verify that both rules correctly identify valid and invalid usage of the `'use client'` directive.

### Conformance tests

The following code examples all fail the rule for the property `notSerializable` with the message `Props must be serializable for components in the "use client" entry file. ${propName} is a function that's not a Server Action.`:

```typescript
'use client';

// Fails below at '() => void', ${propName} is 'notSerializable'
export default function Component(props: { notSerializable: () => void }) {
  return null;
}
```

Whenever the check above fails, the linter should provide the following additional details for the failed check:

```typescript
`Rename "${propName}" either to "action" or have its name end with "Action" e.g. "${propName}Action" to indicate it is a Server Action.`,
```

The following code examples all fail the rule for the property `notSerializable` with the message `Props must be serializable for components in the "use client" entry file, ${propName} is invalid.`:

```typescript
'use client';

class ClassName {}

// Fails below at 'ClassName', ${propName} is 'notSerializable'
export default function Component(props: { notSerializable: ClassName }) {
  return null;
}
```

```typescript
'use client';

type Class<T> = new (...args: any[]) => T;

export default function Component(props: {
  // Fails below at 'Class<String>', ${propName} is 'notSerializable'
  notSerializable: Class<String>;
}) {
  return null;
}
```

No additional information is provided when this check fails.

The following code examples will pass the rule, however:

```typescript
'use client';

export default function Component(props: { propNamedAction: () => void }) {
  return null;
}
```

```typescript
'use client';

export default function Component(props: { action: () => void }) {
  return null;
}
```

```typescript
// If the file name is /[\\/]error\.tsx?$/ or /[\\/]global-error\.tsx?$/
'use client';

export default function Component(props: { reset: () => void }) {
  return null;
}
```

## References

- [Create ESLint plugins](https://eslint.org/docs/latest/extend/plugins)
- [Building Typescript ESLint plugins](https://typescript-eslint.io/developers/eslint-plugins)
- [An example ESLint plugin showing typed linting with @typescript-eslint/utils.](https://github.com/typescript-eslint/examples/tree/main/packages/eslint-plugin-example-typed-linting)
- [Reference implementation for Next.js typescript server](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/typescript/rules/client-boundary.ts)
