// Flat ESLint config (eslint 9+). Tuned for OCC's React 19 + TypeScript + shadcn stack.
// Pragmatic ruleset: catches real bugs (react-hooks/exhaustive-deps, unused vars),
// stays out of formatting (that's pint + the prettier-y conventions inside the
// codebase already). Run with `npm run lint`.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import globals from 'globals';

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            react,
            'react-hooks': reactHooks,
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                // route() helper is provided by Ziggy globally
                route: 'readonly',
            },
        },
        settings: { react: { version: '19.0' } },
        rules: {
            // React 19 + Vite: no need for React in scope
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            // We intentionally use _-prefixed args to silence "unused" markers
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            // Allow `any` — there are legit cases (untyped 3rd-party, Inertia props).
            '@typescript-eslint/no-explicit-any': 'off',
            // Empty interface/object types come up in shadcn primitives — fine.
            '@typescript-eslint/no-empty-object-type': 'off',
            // React 19 typed JSX is fine; namespace warnings happen too often in lib types.
            '@typescript-eslint/no-namespace': 'off',
        },
    },
    {
        // Ignore generated + vendor output
        ignores: [
            'public/**',
            'node_modules/**',
            'vendor/**',
            'storage/**',
            'bootstrap/cache/**',
            'resources/js/types/entities.generated.ts',
            // shadcn ships JSX in .jsx; skip linting those vendor-shaped files
            'resources/js/components/ui/calendar.jsx',
        ],
    },
];
