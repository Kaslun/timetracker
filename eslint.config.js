/**
 * ESLint flat config (v9+).
 *
 * - typescript-eslint strict for type safety
 * - react-hooks for hook correctness
 * - import for import order
 * - prettier last so formatting concerns win
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist/**',
      'out/**',
      'release/**',
      'coverage/**',
      'node_modules/**',
      'time-tracker/**',
      'build/**',
      '.husky/_/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    plugins: {
      'react-hooks': reactHooks,
      'import-x': importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLDivElement: 'readonly',
        NodeJS: 'readonly',
        JSX: 'readonly',
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: { project: ['tsconfig.node.json', 'tsconfig.web.json'] },
      },
    },
    rules: {
      // Classic hook correctness rules only — this project doesn't use the React Compiler
      // so the full recommended-latest preset (which includes compiler purity rules) is
      // intentionally not spread here.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-invalid-void-type': ['error', { allowInGenericTypeArguments: true }],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
        },
      ],
      'import-x/no-unresolved': 'off',
    },
  },
  {
    files: ['src/main/services/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['scripts/**/*.{ts,js,cjs,mjs}', '*.config.{ts,js,cjs,mjs}', 'electron.vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'],
    rules: { 'no-console': 'off', '@typescript-eslint/no-var-requires': 'off' },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'no-console': 'off' },
  },
  prettier,
];
