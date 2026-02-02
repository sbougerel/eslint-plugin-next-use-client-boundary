# @sbougerel/next-use-client-boundary/props-must-be-serializable

📝 Enforce serializable props in Next.js "use client" components.

💼 This rule is enabled in the ☑️ `recommended-type-checked` config.

<!-- end auto-generated rule header -->

Enforce serializable props in Next.js "use client" components.

## Rule Details

This rule validates that props passed to components in files with the `'use client'` directive are serializable, following Next.js's requirements for client boundaries.

In Next.js applications, components marked with `'use client'` can receive props from server components. These props must be serializable (can be transferred across the network boundary). Non-serializable types like functions and class instances are not allowed, with specific exceptions for Server Actions.

### Exceptions

The rule allows:

- Functions named `action` or ending with `Action` (considered Server Actions)
- Functions named `reset` in `error.tsx` or `global-error.tsx` files (Next.js error boundary convention)

### Examples of **incorrect** code:

```tsx
'use client';

// Function prop without Server Action naming
export default function Component(props: { onClick: () => void }) {
  return null;
}
```

```tsx
'use client';

class ClassName {}

// Class instance prop
export default function Component(props: { instance: ClassName }) {
  return null;
}
```

```tsx
'use client';

type Class<T> = new (...args: any[]) => T;

// Constructor type prop
export default function Component(props: { constructor: Class<String> }) {
  return null;
}
```

```tsx
'use client';

// 'reset' outside error files
export default function Component(props: { reset: () => void }) {
  return null;
}
```

### Examples of **correct** code:

```tsx
'use client';

// Primitive types are serializable
export default function Component(props: { name: string; age: number }) {
  return null;
}
```

```tsx
'use client';

// Function named 'action' is allowed
export default function Component(props: { action: () => void }) {
  return null;
}
```

```tsx
'use client';

// Function ending with 'Action' is allowed
export default function Component(props: { submitAction: () => void }) {
  return null;
}
```

```tsx
// In app/error.tsx
'use client';

// 'reset' is allowed in error files
export default function Component(props: { reset: () => void }) {
  return null;
}
```

```tsx
// Without 'use client' directive, rule doesn't apply
export default function Component(props: { onClick: () => void }) {
  return null;
}
```

## When Not To Use It

- If you're not using Next.js App Router with `'use client'` directives
- If you're working on client-only applications without server/client boundaries
- For test files (automatically skipped by the rule)

## Further Reading

- [Next.js: use client directive](https://nextjs.org/docs/app/building-your-application/rendering/client-components#the-use-client-directive)
- [React: use client reference](https://react.dev/reference/rsc/use-client)
- [Next.js: Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
