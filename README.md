# eslint-plugin-next-use-client-boundary

A Typescript ESLint plugin for Next.js projects that enforces serializable props for exported components in `'use client'` modules. This rule aims to emulate the Next.js Typescript server rule [reference implementation here](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/typescript/rules/client-boundary.ts).

## Examples

### Invalid

```typescript
'use client';

// ❌ Error: Functions are not serializable
export function Button({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>Click me</button>;
}

// ❌ Error: Class instances are not serializable
export function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

### Valid

```typescript
'use client';

// ✅ Server Actions are allowed (name ends with "Action")
export function Form({ submitAction }: { submitAction: () => Promise<void> }) {
  return <form action={submitAction}>...</form>;
}

// ✅ Primitive types and plain objects are serializable
export function UserCard({ name, age }: { name: string; age: number }) {
  return <div>{name} is {age} years old</div>;
}

// ✅ Arrays and nested serializable types are allowed
export function List({ items }: { items: Array<{ id: string; title: string }> }) {
  return <ul>{items.map(item => <li key={item.id}>{item.title}</li>)}</ul>;
}
```

## Installation

```bash
npm install --save-dev @sbougerel/eslint-plugin-next-use-client-boundary
# or
yarn add --dev @sbougerel/eslint-plugin-next-use-client-boundary
# or
pnpm add --save-dev @sbougerel/eslint-plugin-next-use-client-boundary
```

## Usage

This plugin requires TypeScript type information to function properly. Add to your ESLint configuration:

```javascript
// eslint.config.mjs
import nextUseClientBoundary from '@sbougerel/eslint-plugin-next-use-client-boundary';
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  nextUseClientBoundary.configs['recommended-type-checked'],
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

### props-must-be-serializable

Enforces serializable props for exported components in `'use client'` modules.

The types that are not supported in [React 'use client' reference on serializable types](https://react.dev/reference/rsc/use-client#serializable-types) will fail the rule:

> - Functions that are not exported from client-marked modules or marked with 'use server'
> - Classes
> - Objects that are instances of any class (other than the built-ins mentioned) or objects with a null prototype
> - Symbols not registered globally, ex. Symbol('my new symbol')

Next.js' reference implementation for this plugin has some differences:

- If a function's name is `action` or ends in `Action`, the rule will pass,
- If a function's name is `reset` and the file name is an error file or a global error file, the rule will pass,
- Symbols that are not registered globally will not fail the rule.

The rule automatically skips test files (files with names containing `.test.` or `.spec.`).

## Known Limitations

- **Nested scope exports**: The rule only searches for variable declarations in the top-level program scope. Variables declared in nested scopes (like within block statements) and then exported are not validated. This pattern is rare in practice:

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

## Development

### Running Tests

After cloning the repository and installing dependencies:

```bash
npm install
npm test
```

The tests verify that the rule correctly identifies valid and invalid usage of the `'use client'` directive.

## References

- [Create ESLint plugins](https://eslint.org/docs/latest/extend/plugins)
- [Building Typescript ESLint plugins](https://typescript-eslint.io/developers/eslint-plugins)
- [An example ESLint plugin showing typed linting with @typescript-eslint/utils.](https://github.com/typescript-eslint/examples/tree/main/packages/eslint-plugin-example-typed-linting)
- [Reference implementation for Next.js typescript server](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/typescript/rules/client-boundary.ts)
