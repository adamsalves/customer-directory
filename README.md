# customer-directory

Diretório de clientes feito para o [desafio de frontend da Juntos Somos Mais](https://github.com/juntossomosmais/frontend-challenge): lista com busca, filtros, ordenação e paginação, e uma página de detalhe por cliente.

**Produção:** https://customer-directory-nu.vercel.app

Os previews de PR exigem login na Vercel; para navegar no app, use a produção.

## Stack

Nuxt 4 (Vue 3 + TypeScript, SSR), Nitro como BFF, CSS Modules + SCSS, Vitest e Playwright. Deploy na Vercel.

## Setup

Requer Node `^24.15.0` e npm.

```sh
nvm install
npm ci
npm run dev
```

## Scripts

| Comando             | O que faz                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run dev`       | servidor de desenvolvimento                                                                                 |
| `npm run build`     | build de produção                                                                                           |
| `npm run preview`   | serve o build de produção                                                                                   |
| `npm run analyze`   | relatório do tamanho do bundle, gravado em `node_modules/.cache/nuxt/.nuxt/analyze/` (apagado por `npm ci`) |
| `npm run lint`      | ESLint + Stylelint + Prettier (`--check`)                                                                   |
| `npm run format`    | Prettier (`--write`)                                                                                        |
| `npm run typecheck` | `nuxt typecheck`                                                                                            |
| `npm test`          | Vitest (unidade, componente e API)                                                                          |
| `npm run test:e2e`  | Playwright (gera o build antes de rodar)                                                                    |

## Performance e bundle

Lighthouse na produção, mobile, com as piores corridas de cada página:

| Página  | Performance | Acessibilidade | Best Practices | SEO |
| ------- | ----------- | -------------- | -------------- | --- |
| Lista   | 99          | 100            | 100            | 100 |
| Detalhe | 95          | 100            | 100            | 100 |

Repetições deram 99–100 na lista e 95–98 no detalhe. Medição com o Lighthouse CLI 13.6.0, throttling mobile simulado, na produção em 2026-11-11.

O LCP fica em 1,0–1,3 s na lista e 2,2–2,3 s no detalhe; o elemento LCP do detalhe é o avatar externo da randomuser.me.

Bundle client, na saída do `npm run analyze`: 104 KB de JS gzip em 9 chunks (os maiores: `ssr.js` 55 KB, `entry.js` 26 KB e `customers.js` 8 KB) e 9,4 KB de CSS gzip em 5 arquivos.

O analyze sobrescreve o `.output` com o build de análise; rode `npm run build` depois para repor o build normal.

## Documentação

- **Decisões de arquitetura:** [`docs/adr/`](docs/adr/README.md)
- **Design (fonte da verdade de UI):** [`docs/design/`](docs/design/), protótipo v2 feito no Claude Design. `diretorio-de-membros.html` é o app completo; `diretorio-de-membros-responsivo.html` traz as molduras de 375 e 768px nos dois temas. Para navegar, clone o repositório e abra o HTML no navegador (o GitHub mostra só o código-fonte). Os desvios estão na [ADR-0013](docs/adr/0013-prototipo-como-fonte-da-verdade.md).
- **Uso de IA:** [`ai-journey/`](ai-journey/README.md)
- **Instruções para agentes de código:** [`AGENTS.md`](AGENTS.md)
