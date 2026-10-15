# 0007. Estratégia de estado

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

A lista tem busca, filtros, ordenação, paginação e itens por página, e o detalhe precisa voltar para a lista no mesmo contexto. O estado precisa sobreviver a recarregar a página e a compartilhar o link.

## Decisão

- **A URL é a fonte da verdade da lista** (`?busca=&estados=&genero=&ordem=&pagina=&por=`). `useListQuery` converte `route.query` para `IListQuery` com `parseListQuery`. Mudar um filtro volta para a página 1. Os links para o detalhe carregam a mesma query.
- **Estado do servidor:** `useFetch`, com cache por chave.
- **`useState`:** só para tema e toast.
- **Estado de UI** (sheet aberto, "Ver todos"): local no componente.
- **Sem store global** (Pinia seria peso morto).

## Consequências

- Qualquer estado da lista vira um link compartilhável, e voltar/avançar no navegador funciona.
- "Voltar para a lista", anterior/próximo e "N de M" funcionam a partir da query.
- Valores padrão não entram na URL, para os links ficarem curtos.
