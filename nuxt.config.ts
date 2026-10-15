export default defineNuxtConfig({
  compatibilityDate: '2026-10-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  // tsconfigPath turns on the type-aware rules (ADR-0016)
  eslint: {
    config: { typescript: { strict: true, tsconfigPath: './tsconfig.json' } },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Diretório de membros',
    },
  },
  // strict and noUncheckedIndexedAccess are Nuxt 4 defaults; noImplicitOverride is missing on the server side (ADR-0016)
  nitro: {
    typescript: {
      tsConfig: { compilerOptions: { noImplicitOverride: true } },
    },
  },
})
