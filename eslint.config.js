// / layered import rules
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  expoConfig,
  ...tseslint.configs.strict,
  {
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/foundation',
              from: ['./src/domain', './src/data', './app', './components'],
              message: 'foundation must be product-agnostic',
            },
            {
              target: './src/domain/entities',
              from: ['./src/data', './src/foundation', './app', './components'],
              message: 'domain/entities must be pure',
            },
            {
              target: './src/domain/services',
              from: ['./src/data', './app', './components'],
              message: 'domain/services must be pure',
            },
            {
              target: ['./app', './components'],
              from: './src/data',
              message: 'presentation must call use-cases, not repos',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      'tooling/**/*.sh',
      'supabase/functions/*/index.ts',
      'eslint.config.js',
    ],
  },
]);
