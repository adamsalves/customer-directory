export default defineNuxtConfig({
  compatibilityDate: '2026-10-15',
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
    },
  },
  // strict and noUncheckedIndexedAccess are Nuxt 4 defaults; noImplicitOverride is missing on the server side (ADR-0016)
  nitro: {
    typescript: {
      tsConfig: { compilerOptions: { noImplicitOverride: true } },
    },
  },
})
