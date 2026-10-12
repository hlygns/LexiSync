// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Tests load a fresh copy of the app's modules per "device", which needs require().
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
