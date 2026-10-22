import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ESLint 9 flat config.
 * eslint-config-next@16 is consumed through the compatibility layer because
 * its shareable configs are still authored in legacy (eslintrc) format.
 */
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next-verify/**', '.next/**', 'node_modules/**', 'scripts/legacy/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
