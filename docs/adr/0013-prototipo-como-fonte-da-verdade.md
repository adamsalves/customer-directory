# 0013. O protótipo é a fonte da verdade de UI

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

O protótipo v2 (`docs/design/diretorio-de-membros.html` e `docs/design/diretorio-de-membros-responsivo.html`) define layout, tokens, textos, comportamento e os dois temas. Os dois arquivos foram gerados no Claude Design.

## Decisão

A implementação reproduz o protótipo, e os tokens têm os mesmos nomes das custom properties dele. Os desvios são estes:

| Protótipo                                           | Implementação                              | Por quê                                         |
| --------------------------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| id = posição no array                               | slug do email                              | estável (ADR-0006)                              |
| layout por `window.innerWidth`                      | media + container queries                  | SSR sem flash (ADR-0014)                        |
| sheet em `div role=dialog` com focus trap manual    | `<dialog>` nativo                          | ADR-0015                                        |
| pills de estado com `aria-pressed`                  | o mesmo checkbox do painel, estilizado     | semântica de formulário                         |
| filtro no browser + fallback por CORS               | BFF Nitro                                  | ADR-0004                                        |
| `hash` routing                                      | rotas reais com SSR                        | SEO e links limpos                              |
| tema em `localStorage`                              | cookie `jsm-theme`                         | ADR-0011                                        |
| `?tema=`                                            | não implementado                           | só serve às molduras do protótipo               |
| `--overlay` claro referencia a si mesmo             | `rgba(20,26,33,.5)`                        | bug: o fundo do sheet sumia                     |
| `--input-border` claro `#8a8f96` (2,99:1 no header) | `#858a91` (3,19:1)                         | contraste mínimo de 3:1                         |
| texto do `kbd` em `--text-count` (4,34:1)           | `--text-muted` (5,35:1)                    | contraste mínimo de 4,5:1                       |
| anel de foco `--link` no rodapé claro (1,77:1)      | `--footer-text` no rodapé (11,37:1)        | contraste mínimo de 3:1                         |
| "membros" e "Usuários" na URL e nos textos          | "clientes"; URL `/customers`               | ADR-0020, ADR-0021                              |
| foco após o skip link fica sob o header sticky      | `scroll-padding-block-start` no `html`     | WCAG 2.4.11 (foco não encoberto)                |
| botão de tema: `aria-pressed` + rótulo que alterna  | rótulo de ação, sem `aria-pressed`         | APG: rótulo não muda com o estado               |
| `UTC0:00` para offset da fonte sem sinal            | `UTC+0:00`                                 | todo offset com sinal explícito                 |
| nome do card em `<span>`                            | `<h2>`                                     | navegação por títulos no leitor de tela         |
| hover do card (`style-hover`) em qualquer ponteiro  | só com `(hover: hover)`, a partir de 640px | toque não deixa o card preso no estado de hover |
| páginas e setas da paginação em `<button>`          | links `NuxtLink` com a query na URL        | cada página tem seu endereço (ADR-0007)         |
| reticência no lugar de uma página só                | o número da página: `1 2 3 4 5 … 8`        | a reticência só vale para duas páginas ou mais  |
| `aria-label` no span da página atual                | o mesmo texto, escondido só da vista       | ARIA 1.2 proíbe nome em `generic`               |
| `aria-hidden` no span da reticência                 | `aria-hidden` no próprio `<li>`            | sem `listitem` vazio para o leitor de tela      |
| espaços de 12px e 4px em qualquer largura           | sem espaços abaixo de 348px de container   | as listas compactas cabem de 320px a 375px      |
| alvos de 32px (44px do projeto abaixo de 960px)     | 40px a 320px (container abaixo de 308px)   | 5 páginas em 288px; mínimo de 24px (WCAG 2.5.8) |
| `goPage` rola se `top < 0` e leva o topo a 130px    | `top` < header + 24px: leva-o a esse ponto | 130 = header + toolbar sticky (ainda não há)    |
| rolagem suave sempre                                | imediata com `prefers-reduced-motion`      | respeita o movimento reduzido do sistema        |

## Consequências

- A conferência visual de cada PR é feita contra `docs/design/`, nos dois temas.
- Novo desvio = nova linha nesta tabela.
