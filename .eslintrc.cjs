module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: {
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-inner-declarations': 'off',
  },
  overrides: [
    {
      files: ['public/js/**/*.js', 'scripts/**/*.mjs'],
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-console': 'off',
        'prefer-const': 'warn',
        'no-var': 'error',
        'no-empty': ['error', { allowEmptyCatch: true }],
      },
    },
    {
      files: ['tests/**/*.js'],
      env: { node: true },
      rules: { 'no-unused-vars': 'off' },
    },
    {
      files: ['public/sw.js'],
      env: { serviceworker: true },
      globals: { self: 'readonly', caches: 'readonly', clients: 'readonly' },
    },
  ],
  ignorePatterns: [
    'dist/',
    'coverage/',
    'node_modules/',
    'public/assets/texturas/thumbs/',
    'public/assets/texturas/diffuse/',
  ],
};
