import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'generated/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Matches tsconfig's noUnusedParameters convention: a leading
      // underscore marks an intentionally-unused parameter (e.g. Express
      // handlers that must accept req/res/next but don't use all three).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // Must be last: turns off every ESLint rule that would fight Prettier's
  // formatting, so linting and formatting never disagree about the same line.
  eslintConfigPrettier,
);
