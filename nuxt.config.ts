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
      // What a page that sets no title of its own has. The list and the customer set theirs, and the
      // error page too (ADR-0020).
      title: 'Diretório de clientes',
      // The prototype's, with "clientes" (ADR-0020): every page has it
      meta: [
        {
          name: 'description',
          content:
            'Diretório de clientes Juntos Somos Mais: busque por nome, filtre por estado e veja os detalhes de cada cliente.',
        },
      ],
      // Sets the system theme before the first paint when there is no cookie yet (ADR-0011).
      // `critical` sorts it right after charset/viewport, ahead of every stylesheet and bundle.
      script: [{ innerHTML: THEME_SCRIPT, tagPriority: 'critical' }],
      // Preload only the latin subset (covers pt-BR); one variable file serves every weight.
      // Font preloads need crossorigin even for same-origin files, or the font is fetched twice.
      // head links don't get app.baseURL: prefix the href if the app ever moves off "/".
      // The site icons come from the logo (#43): the SVG is the preferred one and carries the same
      // art as the ICO, which holds the 16/32/48 rasters for readers without SVG icons. The
      // apple-touch is flat (iOS flattens transparency to black), on the light --header-bg.
      link: [
        {
          rel: 'preload',
          href: '/fonts/roboto-latin.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: '',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  routeRules: {
    // The root has no page of its own: the list is the home, as in the prototype (#9)
    '/': { redirect: '/customers' },
    // The list lived at /clientes up to v0.2.0 (ADR-0021)
    '/clientes': { redirect: '/customers' },
    // Font files never change in place: a new font ships under a new file name
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  // Server-only. NUXT_CUSTOMERS_URL overrides it at runtime, which is how the API integration
  // spec points the server at a local copy of the fixture instead of S3 (ADR-0009).
  runtimeConfig: {
    customersUrl: 'https://jsm-challenges.s3.amazonaws.com/frontend-challenge.json',
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
