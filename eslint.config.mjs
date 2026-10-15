// @ts-check
import prettier from 'eslint-config-prettier'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  prettier,
  {
    // An eslint-disable comment would bypass every rule below (ADR-0016)
    linterOptions: { noInlineConfig: true },
    rules: {
      // npm hoists node_modules, so a transitive package would import fine (ADR-0018)
      'import/no-extraneous-dependencies': [
        'error',
        { includeTypes: true, devDependencies: ['**/*.spec.ts', 'tests/**', '*.config.*'] },
      ],
      // A type argument on a fetch is a cast in disguise (ADR-0016): $fetch<T>, $fetch.raw<T>,
      // useNuxtApp().$fetch<T>, useRequestFetch()<T>, useAsyncData<T>…
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[typeArguments]:matches([callee.name=/fetch|asyncdata/i], [callee.property.name=/fetch/i], [callee.object.name=/fetch/i], [callee.callee.name=/fetch/i], [callee.callee.object.name=/fetch/i])',
          message: 'Do not pass a type argument: let Nitro infer it or validate the data.',
        },
      ],
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      // typescript-eslint never sees the <template> (ADR-0016)
      'vue/no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression:not([typeAnnotation.typeName.name="const"])',
          message: 'No `as` in templates (ADR-0016).',
        },
        { selector: 'TSNonNullExpression', message: 'No `!` in templates (ADR-0016).' },
      ],
      // Stylelint does not read <style> blocks (ADR-0003)
      'vue/no-restricted-block': [
        'error',
        { element: 'style', message: 'Use Name.module.scss (ADR-0003).' },
      ],
    },
  },
  {
    // Upstream turns this off for components/*/**, which is exactly our Name/Name.vue layout
    files: ['app/components/**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'error' },
  },
  {
    // allowJs without checkJs: a .js file would escape lint and typecheck
    files: ['{app,server,shared}/**/*.{js,mjs,cjs}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Program', message: 'Write TypeScript (ADR-0016).' },
      ],
    },
  },
)
  // Honest typing (ADR-0016): every escape hatch is an error, tests included
  .override('nuxt/typescript/rules', {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true },
      ],
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-unsafe-enum-comparison': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-unsafe-unary-minus': 'error',
      // strict-type-checked rules the Nuxt preset (strict-type-checked-only) leaves out
      '@typescript-eslint/no-dynamic-delete': 'error',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-invalid-void-type': 'error',
      '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/prefer-literal-enum-member': 'error',
      '@typescript-eslint/unified-signatures': 'error',
    },
  })
