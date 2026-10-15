// @ts-check
import prettier from 'eslint-config-prettier'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  prettier,
  // npm hoists node_modules, so a transitive package would import fine (ADR-0018)
  {
    rules: {
      'import/no-extraneous-dependencies': 'error',
      // A type argument on a fetch is a cast in disguise (ADR-0016)
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.name=/^(\\$fetch|useFetch|useLazyFetch|useAsyncData|useLazyAsyncData)$/][typeArguments]',
          message: 'Do not pass a type argument: let Nitro infer it or validate the data.',
        },
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
    },
  })
