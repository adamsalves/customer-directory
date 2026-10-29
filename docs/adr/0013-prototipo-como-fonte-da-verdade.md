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
| espaços de 12px e 4px em qualquer largura           | sem espaços abaixo de 348px de container   | as listas compactas cabem de 280px a 375px      |
| alvos de 32px (44px do projeto abaixo de 960px)     | container ÷ 7 abaixo de 308px (41px a 320) | 5 páginas a 280px; mínimo de 24px (WCAG 2.5.8)  |
| `goPage` rola se `top < 0` e leva o topo a 130px    | `top` < header+barra+24px: leva-o até lá   | 130 = header + toolbar sticky (barra do sheet)  |
| rolagem suave sempre                                | imediata com `prefers-reduced-motion`      | respeita o movimento reduzido do sistema        |
| filtra a cada tecla, sem espera                     | grava a URL 300ms depois da última tecla   | cada gravação da URL refaz a busca no BFF       |
| `replaceState` em toda busca                        | `replace` na lista, `push` vindo de fora   | voltar não percorre cada termo e volta à origem |
| link de 272px a partir de 960px, com pílula e foco  | coluna do grid; pílula e foco só na imagem | a pílula é do logo (dono); protótipo no M9      |
| "Limpar busca e filtros" não move o foco            | o foco vai para os resultados (`#results`) | o botão sai e o foco cai no `body` (ADR-0022)   |
| esmaecido `opacity` .45 (2,58:1), sheet .5 (2,93:1) | `color: var(--text-muted)` (5,83:1)        | contraste mínimo de 4,5:1 num controle ativo    |
| contagem com `aria-label` num `span`                | texto oculto "N clientes" ("1 cliente")    | ARIA 1.2 proíbe nome em `generic`               |
| desmarcar um estado fora dos 5 não move o foco      | o foco vai para o botão "Ver todos"        | o item sai da lista e o foco cai no `body`      |
| "Ver todos" com `aria-expanded`                     | `aria-expanded` + `aria-controls`          | disclosure do APG: aponta a lista que abre      |
| "Limpar filtros" não move o foco                    | o foco vai para os resultados (`#results`) | o botão sai e o foco cai no `body` (ADR-0022)   |
| `replaceState` em todo filtro                       | `push` a cada filtro                       | voltar desfaz o filtro (ADR-0007)               |
| remover um chip não move o foco                     | foco: chip seguinte, anterior, `#results`  | o chip sai e o foco cai no `body` (ADR-0022)    |
| chip de 32px de altura em qualquer largura          | 44px abaixo de 960px                       | alvo de toque do projeto: 44px                  |
| rótulo do chip sem limite de largura                | uma linha com reticências                  | uma busca longa sem espaço estoura a tela       |
| botão "Filtros" com `aria-expanded`                 | só `aria-haspopup="dialog"`                | o botão fica inerte com o sheet aberto          |
| rótulo "Filtros, 1 ativos"                          | "Filtros, 1 ativo"                         | concordância: o plural só a partir de 2         |
| "Limpar" do sheet com `disabled`                    | `aria-disabled="true"`, sem `disabled`     | o botão desabilitado perde o foco do clique     |
| o sheet fecha ao passar de 960px (`onResize`)       | continua aberto; o foco cai no `body`      | a largura é só CSS (ADR-0014); o botão saiu     |
| "Ver N membros" com o total do filtro local         | último total; sem resposta, "Ver clientes" | o total vem do BFF; na busca vale o anterior    |
| `max-height: 88vh` no sheet                         | `max-block-size: 88dvh`                    | `vh` não acompanha a barra de URL do celular    |
| `body.style.overflow = 'hidden'` ao abrir o sheet   | `overflow` + `scrollbar-gutter` no `html`  | só o `:modal` trava; a barra sai e nada se move |
| o fundo é um `div` à parte, com `onClick`           | fecha se apertar e soltar no fundo         | o arrasto que cruza a borda clica no `<dialog>` |
| o 2º clique de um clique duplo age no sheet         | ignora clique com `detail > 1` no sheet    | o 2º clique de "Filtros" cai no sheet aberto    |
| gênero segmentado com `role="radio"` num `button`   | os mesmos rádios do painel, estilizados    | semântica de formulário e setas do navegador    |
| contagem do segmentado em `--text-count`            | `--text-muted`; no ativo, a cor do rótulo  | 4,34:1 no inativo claro; 2,52:1 no ativo escuro |

## Consequências

- A conferência visual de cada PR é feita contra `docs/design/`, nos dois temas.
- Novo desvio = nova linha nesta tabela.
