# 0023. Gravações da lista em voo, por router, no `useListQuery`

- **Status:** Aceita
- **Data:** 2026-10-28

## Contexto

A URL é a fonte da verdade da lista ([ADR-0007](0007-estrategia-de-estado.md)), e quatro lugares a gravam: o `SearchField`, o `FilterPanel`, o "Limpar" da página e o seletor de itens por página do `PaginationNav`. Cada gravação é uma navegação, e o Nuxt espera um quadro antes de confirmar cada uma (`navigation-repaint`). Nesse intervalo a rota ainda tem o estado antigo. Quem grava a partir do `query.value` não enxerga a gravação que está a caminho, e a navegação nova cancela a antiga: a escolha some sem aviso (#90). O caso reproduzível: digitar na busca, marcar "Bahia" dentro da espera de 300 ms e deixar a busca disparar. Ela monta a URL sem a Bahia e substitui a entrada.

O `FilterPanel` e o `SearchField` tinham cada um o seu `pending`, mas só enxergavam o próprio. O "Limpar" e o seletor de itens por página não tinham nenhum.

## Decisão

- O estado da gravação que a URL ainda não tem vive dentro de `useListQuery`, num `WeakMap` do módulo chaveado pelo `useRouter()`. O router é um por requisição no servidor e um só no navegador: nada passa de uma requisição a outra, e todo uso do composable na mesma árvore enxerga o mesmo valor.
- `setQuery(change, { replace })` recebe o que muda e monta o próximo estado sobre o que está em voo, ou sobre o da URL quando nada está. Guarda esse estado como em voo, navega e o solta quando a navegação termina (pousou, foi abortada ou cancelada), mas só se ele ainda for o mais recente. A Promise devolvida resolve depois dessa limpeza. Um objeto inteiro continua sendo uma mudança válida: sobrescreve tudo.
- `pending()` devolve o estado em voo. Quem decide a partir do estado da lista (o `toggleState`, o `commit` da busca) parte de `pending() ?? query.value`.
- Os `pending` de cada componente deixam de existir. O `SearchField` ainda precisa reconhecer a própria gravação quando ela chega pela rota, porque o rascunho já está à frente dela pelas teclas digitadas depois. Ele olha o `pending()` e a espera da digitação, que continua rodando. Só o `pending()` não bastaria: o "Limpar" da página também está em voo com a busca que chega (vazia), mas sem espera atrás, e o campo precisa acompanhá-lo.

### Alternativas recusadas

- `useState`: o ADR-0007 o reserva para tema e toast, e ele é reativo e serializado no payload do SSR para durar entre servidor e cliente. Uma gravação dura um quadro e nada renderiza a partir dela.
- `ref` solto no módulo: seria um só para todas as requisições do servidor, e uma requisição leria a gravação de outra.
- `pending` por componente, como estava: cada um só vê a própria gravação, que é o defeito da #90.

## Consequências

- O ADR-0007 continua valendo: a URL é a verdade e não há store global. O estado em voo é só o intervalo entre gravar e a rota chegar.
- Quem grava a lista diz só o que muda. O "Limpar" mantém o `perPage` que o seletor acabou de pedir, e a busca leva consigo o filtro marcado no mesmo quadro.
- Os links da paginação (`NuxtLink`) montam a URL a partir do `query.value` e não passam por `setQuery`: um clique neles dentro do quadro ainda cancela uma gravação em voo. O `replace` também pode absorver a entrada de histórico de um `push` que ainda estava a caminho. Nenhum dos dois foi tratado aqui.
- Quando outra gravação cancela a escolha do `FilterPanel`, os controles não são ressincronizados, porque ela parte da escolha e a leva à URL. A exceção é o "Limpar" dentro do mesmo quadro: a caixa continua marcada com a URL limpa. Só quando nada mais está em voo (voltar, um link) o painel devolve os controles ao que a URL diz.
