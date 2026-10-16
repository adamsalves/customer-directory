# customer-directory

Diretório de membros feito para o [desafio de frontend da Juntos Somos Mais](https://github.com/juntossomosmais/frontend-challenge): lista com busca, filtros, ordenação e paginação, e uma página de detalhe por membro.

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

| Comando             | O que faz                                 |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | servidor de desenvolvimento               |
| `npm run build`     | build de produção                         |
| `npm run preview`   | serve o build de produção                 |
| `npm run lint`      | ESLint + Stylelint + Prettier (`--check`) |
| `npm run format`    | Prettier (`--write`)                      |
| `npm run typecheck` | `nuxt typecheck`                          |
| `npm test`          | Vitest (unidade, componente e API)        |
| `npm run test:e2e`  | Playwright (gera o build antes de rodar)  |

## Documentação

- **Decisões de arquitetura:** [`docs/adr/`](docs/adr/README.md)
- **Design (fonte da verdade de UI):** [`docs/design/`](docs/design/), protótipo v2 feito no Claude Design. `diretorio-de-membros.html` é o app completo e a referência de tokens e textos; `diretorio-de-membros-responsivo.html` traz as molduras de 375 e 768px nos dois temas e vale só para layout. Para navegar, clone o repositório e abra o HTML no navegador (o GitHub mostra só o código-fonte). Os desvios estão na [ADR-0013](docs/adr/0013-prototipo-como-fonte-da-verdade.md).
- **Uso de IA:** [`ai-journey/`](ai-journey/README.md)
- **Instruções para agentes de código:** [`AGENTS.md`](AGENTS.md)
