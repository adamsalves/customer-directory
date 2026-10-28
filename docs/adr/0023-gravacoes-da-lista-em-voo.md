# 0023. Gravações da lista em voo, por router, no `useListQuery`

- **Status:** Aceita
- **Data:** 2026-10-28

## Contexto

A URL é a fonte da verdade da lista ([ADR-0007](0007-estrategia-de-estado.md)), e quatro lugares a gravam: o `SearchField`, o `FilterPanel`, o "Limpar" da página e o seletor de itens por página do `PaginationNav`. Cada gravação é uma navegação, e o Nuxt espera um quadro antes de confirmar cada uma (`navigation-repaint`). Nesse intervalo a rota ainda tem o estado antigo. Quem grava a partir do `query.value` não enxerga a gravação que está a caminho, e a navegação nova cancela a antiga: a escolha some sem aviso (#90). O caso reproduzível: digitar na busca, marcar "Bahia" dentro da espera de 300 ms e deixar a busca disparar. Ela monta a URL sem a Bahia e substitui a entrada.

O `FilterPanel` e o `SearchField` tinham cada um o seu `pending`, mas só enxergavam o próprio. O "Limpar" e o seletor de itens por página não tinham nenhum.

## Decisão

- O estado da gravação que a URL ainda não tem vive dentro de `useListQuery`, num `WeakMap` do módulo chaveado pelo `useRouter()`. O router é um por requisição no servidor e um só no navegador: nada passa de uma requisição a outra, e todo uso do composable na mesma árvore enxerga o mesmo valor.
- O valor é um `shallowRef`. É reativo porque há quem renderize a partir dele (os links da paginação), e raso porque uma gravação o troca inteiro e ninguém o edita. No servidor nada grava durante a renderização: ele fica vazio e não passa pelo payload do SSR, como passaria um `useState`.
- `setQuery(change, { replace })` recebe o que muda e monta o próximo estado sobre o que está em voo, ou sobre o da URL quando nada está. Guarda esse estado como em voo, junto com a informação de ele ser um push, navega e o solta quando a navegação termina (pousou, foi abortada ou cancelada), mas só se ele ainda for o mais recente. A Promise devolvida resolve depois dessa limpeza. Um objeto inteiro continua sendo uma mudança válida: sobrescreve tudo.
- Um `replace` feito sobre um push em voo sai como push. Como `replace`, ele tomaria o lugar da entrada de histórico que o push está acrescentando, e o Voltar pularia a escolha. Terminado o push, o `replace` volta a substituir.
- `pending()` devolve o estado da lista em voo, ou `undefined`, e é reativo. Quem decide a partir do estado da lista parte de `pending() ?? query.value`: o `toggleState`, o `commit` da busca e os links da paginação. Um clique num link cancela a gravação em voo, e a página que pousa leva o que ela escrevia.
- Quem precisa saber que nada mais está a caminho também olha `pending()`:
  - O `FilterPanel` devolve os controles ao que a URL diz quando ele vira `undefined`, depois da renderização. O Vue só reescreve `checked` quando o valor da linha muda, e uma escolha que não chega à URL deixa a caixa com o clique: foi cancelada por Voltar ou por um link, ou por uma gravação que pousou com os mesmos estados que a URL já tinha (o "Limpar" no mesmo quadro). Uma escolha cancelada por uma gravação que a leva (a escolha seguinte, a busca) continua a caminho até essa pousar, e os controles ficam como foram clicados.
  - O `PaginationNav` só descarta a âncora do seletor numa falha se nenhuma gravação em voo levar o mesmo `perPage`. O "Limpar" no mesmo quadro cancela a navegação do seletor, mas monta sobre ela, e a lista que carrega é a do tamanho pedido.
- Os `pending` de cada componente deixam de existir. O `SearchField` guarda só uma marca privada com a busca que gravou, para o watcher reconhecer a chegada dela pela rota: o rascunho já está à frente dessa chegada pelas teclas digitadas depois, e a chegada do "Limpar" da página traz a mesma busca vazia, mas sem teclas atrás. A marca não é estado em voo. O estado em voo diz o que está a caminho, não quem gravou, e uma escolha do painel no mesmo quadro leva a busca do campo sem que o campo a tenha gravado. Nada mais lê a marca, e ela não decide gravação nenhuma.
  - Qualquer chegada de busca esquece a marca: foi aquela gravação, ou outra coisa trouxe outra busca. Uma gravação que pousa sem mudar a busca (só a página muda) não chega, e a próxima mudança da busca limpa a marca.
  - Uma gravação do campo que falha também a esquece, a não ser que a gravação que a cancelou ainda leve a mesma busca (a escolha do painel no mesmo quadro).
  - O watcher não consulta `pending()`, e o fim da gravação com sucesso não mexe na marca. A ordem entre a chegada pela rota e o fim da Promise deixa de importar. Ela varia: o `useRoute()` do header é a rota global do Nuxt, que numa navegação para outra página só se atualiza quando a página nova resolve (`page:finish`), e isso pode vir depois do fim da Promise.

### Alternativas recusadas

- `useState`: o ADR-0007 o reserva para tema e toast, e ele é serializado no payload do SSR para durar entre servidor e cliente. Uma gravação dura um quadro e não deve atravessar essa fronteira. O `shallowRef` por router dá a reatividade sem o payload e sem virar store.
- `ref` solto no módulo: seria um só para todas as requisições do servidor, e uma requisição leria a gravação de outra.
- `pending` por componente, como estava: cada um só vê a própria gravação, que é o defeito da #90.

## Consequências

- O ADR-0007 continua valendo: a URL é a verdade e não há store global. O estado em voo é só o intervalo entre gravar e a rota chegar.
- Quem grava a lista diz só o que muda. O "Limpar" mantém o `perPage` que o seletor acabou de pedir, a busca leva consigo o filtro marcado no mesmo quadro, e o link de outra página leva a escolha que ainda não chegou à URL.
- O histórico não perde a entrada de uma escolha: a busca que dispara por cima dela entra como push.
- Os controles do painel voltam ao que a URL diz sempre que nada mais está em voo: depois de Voltar ou de um link que cancela a escolha, e depois de um "Limpar" feito no mesmo quadro dela.
- O `SearchField` mantém a marca ao lado do estado em voo. É o único lugar que precisa saber quem gravou, e o composable não conhece os autores das gravações.
