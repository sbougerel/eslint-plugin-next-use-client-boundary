import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../src/rules/props-must-be-serializable';
import { afterAll, describe, it } from 'vitest';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*', 'app/*.ts*', 'app/*/*.ts*'],
      },
      tsconfigRootDir: process.cwd(),
    },
  },
});

ruleTester.run('props-must-be-serializable', rule, {
  valid: [
    // No 'use client' directive
    {
      name: 'without use client directive',
      code: `
        export default function Component(props: { notSerializable: () => void }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    // Serializable props
    {
      name: 'with serializable primitive props',
      code: `
        'use client';

        export default function Component(props: { name: string; age: number; active: boolean }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    {
      name: 'with serializable array props',
      code: `
        'use client';

        export default function Component(props: { items: string[]; numbers: number[] }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    {
      name: 'with serializable object props',
      code: `
        'use client';

        export default function Component(props: { user: { name: string; age: number } }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    // Function named 'action'
    {
      name: 'with action prop',
      code: `
        'use client';

        export default function Component(props: { action: () => void }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    // Function ending with 'Action'
    {
      name: 'with submitAction prop',
      code: `
        'use client';

        export default function Component(props: { submitAction: () => void }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    {
      name: 'with deleteAction prop',
      code: `
        'use client';

        export default function Component(props: { deleteAction: () => Promise<void> }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    // Reset in error files
    {
      name: 'with reset prop in error.tsx',
      code: `
        'use client';

        export default function Component(props: { reset: () => void }) {
          return null;
        }
      `,
      filename: 'app/error.tsx',
    },
    {
      name: 'with reset prop in global-error.tsx',
      code: `
        'use client';

        export default function Component(props: { reset: () => void }) {
          return null;
        }
      `,
      filename: 'app/global-error.tsx',
    },
    {
      name: 'with reset prop in nested error.tsx',
      code: `
        'use client';

        export default function Component(props: { reset: () => void }) {
          return null;
        }
      `,
      filename: 'app/dashboard/error.tsx',
    },
    // Test files (should be skipped)
    {
      name: 'test file with .test.tsx extension',
      code: `
        'use client';

        export default function Component(props: { notSerializable: () => void }) {
          return null;
        }
      `,
      filename: 'component.test.tsx',
    },
    {
      name: 'test file with .spec.ts extension',
      code: `
        'use client';

        export default function Component(props: { notSerializable: () => void }) {
          return null;
        }
      `,
      filename: 'component.spec.ts',
    },
    // Components with no props
    {
      name: 'component without props',
      code: `
        'use client';

        export default function Component() {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    // Named exports
    {
      name: 'named export with action',
      code: `
        'use client';

        export function Component(props: { action: () => void }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
    // Arrow function exports
    {
      name: 'arrow function with action',
      code: `
        'use client';

        export const Component = (props: { action: () => void }) => {
          return null;
        };
      `,
      filename: 'component.tsx',
    },
    // Multiple valid actions
    {
      name: 'multiple action props',
      code: `
        'use client';

        export default function Component(props: {
          submitAction: () => void;
          deleteAction: () => void;
          action: () => void;
        }) {
          return null;
        }
      `,
      filename: 'component.tsx',
    },
  ],

  invalid: [
    // Function props without action naming
    {
      name: 'function prop not named as action',
      code: `
        'use client';

        export default function Component(props: { notSerializable: () => void }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'notSerializable' },
        },
      ],
    },
    {
      name: 'function prop with callback name',
      code: `
        'use client';

        export default function Component(props: { onClick: () => void }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'onClick' },
        },
      ],
    },
    {
      name: 'function prop with handler name',
      code: `
        'use client';

        export default function Component(props: { onSubmit: (data: string) => Promise<void> }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'onSubmit' },
        },
      ],
    },
    // Class type props
    {
      name: 'class instance prop',
      code: `
        'use client';

        class ClassName {}

        export default function Component(props: { notSerializable: ClassName }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'invalidProp',
          data: { propName: 'notSerializable' },
        },
      ],
    },
    // Constructor type props
    {
      name: 'constructor type prop',
      code: `
        'use client';

        type Class<T> = new (...args: any[]) => T;

        export default function Component(props: {
          notSerializable: Class<String>;
        }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'invalidProp',
          data: { propName: 'notSerializable' },
        },
      ],
    },
    // Reset outside error files
    {
      name: 'reset prop outside error file',
      code: `
        'use client';

        export default function Component(props: { reset: () => void }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'reset' },
        },
      ],
    },
    // Named exports with invalid props
    {
      name: 'named export with invalid function prop',
      code: `
        'use client';

        export function Component(props: { onClick: () => void }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'onClick' },
        },
      ],
    },
    // Arrow function with invalid props
    {
      name: 'arrow function with invalid function prop',
      code: `
        'use client';

        export const Component = (props: { onChange: (value: string) => void }) => {
          return null;
        };
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'onChange' },
        },
      ],
    },
    // Multiple invalid props
    {
      name: 'multiple invalid props',
      code: `
        'use client';

        class MyClass {}

        export default function Component(props: {
          onClick: () => void;
          notSerializable: MyClass;
          onSubmit: () => void;
        }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'onClick' },
        },
        {
          messageId: 'invalidProp',
          data: { propName: 'notSerializable' },
        },
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'onSubmit' },
        },
      ],
    },
    // Mixed valid and invalid props
    {
      name: 'mixed valid and invalid props',
      code: `
        'use client';

        export default function Component(props: {
          name: string;
          submitAction: () => void;
          onClick: () => void;
          age: number;
        }) {
          return null;
        }
      `,
      filename: 'component.tsx',
      errors: [
        {
          messageId: 'functionNotServerAction',
          data: { propName: 'onClick' },
        },
      ],
    },
  ],
});
