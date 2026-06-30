module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-types': 'off',
    'no-unused-vars': 'off',
    'vue/multi-word-component-names': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }]
  },
  overrides: [
    {
      // Root-level CommonJS Node scripts (walkthrough / verification helpers).
      // require(), console output and intentional empty catch blocks are
      // idiomatic for these standalone CLI scripts, not browser app code.
      files: ['*.cjs'],
      parser: 'espree',
      parserOptions: { sourceType: 'script' },
      // browser stays enabled: some scripts run Playwright page.waitForFunction
      // callbacks that reference DOM globals (document, etc.).
      env: { node: true, browser: true },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        'no-console': 'off',
        'no-empty': 'off'
      }
    },
    {
      // Standalone ESM build/CLI scripts under bin/ (e.g. the plugin-version
      // stamper). console output is their entire purpose, not browser code.
      // Scoped to *.mjs so bin/*.ts keeps the default TypeScript parser.
      files: ['bin/**/*.mjs'],
      parser: 'espree',
      parserOptions: { sourceType: 'module', ecmaVersion: 2022 },
      env: { node: true },
      rules: {
        'no-console': 'off'
      }
    }
  ],
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  ignorePatterns: ['node_modules/', 'dist/', 'vbwd-fe-core/']
};
