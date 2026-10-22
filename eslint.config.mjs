import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * ESLint 9 flat config.
 * eslint-config-next@16 ships native flat configs, so no FlatCompat
 * compatibility layer is required anymore.
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      '.next-verify/**',
      '.next/**',
      'node_modules/**',
      'scripts/legacy/**',
      // Agent/AI tooling state — not application code
      '.agent/**',
      '.agents/**',
      'scratch/**',
    ],
  },
  // Legacy CommonJS ops/migration scripts — require() is intentional there
  {
    files: ['scripts/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
      // React Compiler-era hooks rules phase in as warnings until the
      // ~30 sync-setState-in-effect call sites get refactored.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default eslintConfig;
