# 0002. Nuxt 4 (Vue 3 + TypeScript) com SSR

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

A JSM trabalha com Vue e publica um [frontend-guideline](https://github.com/juntossomosmais/frontend-guideline). O desafio avalia performance, SEO básico e boas práticas, e a página de detalhe precisa ter um link compartilhável com meta tags.

## Decisão

Usar Nuxt 4 (4.6.x) com TypeScript, SSR e o diretório `app/` como `srcDir`. O Nitro, que vem com o Nuxt, faz o papel de BFF (ADR-0004).

## Consequências

- O HTML sai do servidor já com conteúdo e meta tags (`useSeoMeta`), o que ajuda no LCP e no SEO.
- Rotas reais em vez do `hash` routing do protótipo.
- A estrutura sugerida pelo desafio usa `src/`. O Nuxt 4 usa `app/`, e o README documenta esse desvio.
- Tudo que depende do navegador precisa respeitar a hidratação (sem largura via JS, ADR-0014; tema via cookie, ADR-0011).
