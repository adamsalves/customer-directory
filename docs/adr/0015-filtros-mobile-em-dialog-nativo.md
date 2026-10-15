# 0015. Filtros no mobile em `<dialog>` nativo

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

Abaixo de 960px os filtros abrem num bottom sheet. O protótipo usa `div role="dialog"` com focus trap feito à mão.

## Decisão

Usar `<dialog>` com `showModal()`. O conteúdo é o mesmo `FilterPanel` do painel lateral, com outro estilo.

## Consequências

- O navegador faz o focus trap, fecha com `Esc`, deixa o fundo inerte e devolve o foco ao botão que abriu.
- Menos código e menos risco de bug de acessibilidade.
- A animação de entrada (`jsmUp`) é feita em CSS e desligada com `prefers-reduced-motion`.
