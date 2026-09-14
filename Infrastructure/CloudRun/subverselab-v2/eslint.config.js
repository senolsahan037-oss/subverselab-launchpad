import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

/*  One rule, and it is here because of a specific outage.
 *
 *  ToolRoom's session-handoff effect was written below the members wall, so a
 *  signed-out visitor returned before reaching it and a signed-in one did not.
 *  React identifies hooks by call order, so signing in changed the count and
 *  React threw "Rendered more hooks than during the previous render" — which
 *  unmounts the tree. The symptom was an empty page immediately after clicking
 *  "Continue with Google", which looks like a broken sign-in and is not one.
 *
 *  A hand-written checker was tried first and missed the very violation it was
 *  written for: the early returns sit inside `if (…) { return … }` blocks, one
 *  indent deeper than it expected. It reported a clean pass on code that was
 *  provably broken, which is worse than no check. This is the rule that
 *  actually understands the language.
 */
export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
