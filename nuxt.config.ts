import { THEME_SCRIPT } from './app/utils/themeScript'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  // tsconfigPath turns on the type-aware rules (ADR-0016)
  eslint: {
    config: { typescript: { strict: true, tsconfigPath: './tsconfig.json' } },
  },
  css: ['~/assets/styles/tokens.scss', '~/assets/styles/base.scss'],
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Diretório de clientes',
      // Sets the system theme before the first paint when there is no cookie yet (ADR-0011).
      // `critical` sorts it right after charset/viewport, ahead of every stylesheet and bundle.
      script: [{ innerHTML: THEME_SCRIPT, tagPriority: 'critical' }],
      // Preload only the latin subset (covers pt-BR); one variable file serves every weight.
      // Font preloads need crossorigin even for same-origin files, or the font is fetched twice.
      // head links don't get app.baseURL: prefix the href if the app ever moves off "/".
      link: [
        {
          rel: 'preload',
          href: '/fonts/roboto-latin.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: '',
        },
      ],
    },
  },
  routeRules: {
    // The root has no page of its own: the list is the home, as in the prototype (#9)
    '/': { redirect: '/customers' },
    // Font files never change in place: a new font ships under a new file name
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  // Root tool configs, E2E specs and spec helpers in tests/ need a tsconfig for the type-aware rules
  typescript: {
    nodeTsConfig: { include: ['../*.config.ts', '../tests/*.ts', '../tests/e2e/**/*'] },
  },
  // strict and noUncheckedIndexedAccess are Nuxt 4 defaults; noImplicitOverride is missing on the server side (ADR-0016)
  nitro: {
    typescript: {
      tsConfig: { compilerOptions: { noImplicitOverride: true } },
    },
  },
})
