// ESLint flat config for the starter's src/ and every site's src/ (sites have no config of their own).
// `npm run lint:code` runs it. No rule is turned off to get a pass; an inline disable needs a reason
// on the same line (`-- reason`). Exported repositories get this file unchanged (its globs are relative).
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.astro/**',
      '**/node_modules/**',
      'qa/**',
      '.cache/**',
      'scripts/**',
      'tests/**',
      'openspec/**',
    ],
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-recommended'],
  {
    // The TypeScript parser for the frontmatter: without it every `interface Props` is a parse error.
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.astro'],
      },
    },
  },
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
];
