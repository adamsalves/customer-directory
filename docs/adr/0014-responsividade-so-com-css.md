# 0014. Responsividade só com CSS

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

O protótipo escolhe o layout (grid, linha, sheet) lendo `window.innerWidth` em JS. Com SSR, o servidor não conhece a largura, o que causa flash e hydration mismatch.

## Decisão

Toda variação de layout usa media queries (`<640`, `<960`, `≥960`) e container queries. Nenhum componente decide layout por largura em JS.

## Consequências

- O HTML do servidor já sai correto em qualquer largura.
- Componentes que mudam muito entre larguras (card em grid ou em linha) renderizam a mesma marcação, e o CSS muda a apresentação.
