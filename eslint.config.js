import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Le moteur de règles et l'IA doivent rester purs : aucune dépendance à Phaser.
    files: ['src/engine/**/*.ts', 'src/ia/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['phaser', '*/game/*', '../game/*'] }],
    },
  },
  prettier,
);
