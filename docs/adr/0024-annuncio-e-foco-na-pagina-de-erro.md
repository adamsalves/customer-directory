# 0024. Anúncio e foco na página de erro

- **Status:** Aceita
- **Data:** 2026-11-10

## Contexto

A auditoria de acessibilidade da #41 provou três defeitos, todos da página de erro (do review do PR #121). O `error.vue` substitui o `app.vue`, que era onde morava o `<NuxtRouteAnnouncer />`: entrar no erro numa navegação no cliente e sair dele por "Ver lista de clientes" não anunciava a troca de página. A mesma troca deixa o foco no `<body>` — a view que o tinha foi substituída no meio da navegação —, sem ponto de entrada para quem usa teclado ou leitor de tela. O "Pular para o conteúdo", por fim, limpava o erro: o `#conteudo` disparava uma navegação, o `afterEach` embutido do router do Nuxt chamava o `clearError`, e a página do cliente refazia a busca a `/api/customers/<slug>` antes de lançar o 404 de novo.

## Decisão

- O announcer mora no `layouts/default.vue`, primeira filho do layout. Ele é um singleton no `nuxtApp` que anuncia o `document.title` a cada `dom:rendered`; o layout é renderizado pelo `app.vue` e pelo `error.vue`, que o pede ao substituir o `app.vue`, então um só announcer sobrevive à página de erro e anuncia a entrada e a saída dela, sem corrida de mount. Duplicá-lo no `app.vue` anunciaria duas vezes.
- O título do erro recebe o foco no mount: o `h1` ganha `tabindex="-1"` e o `focus()` do `onMounted`, cobrindo a navegação no cliente e o acesso direto por URL. Ele é alvo de foco programático, nunca uma parada de tab: `outline: none` nele, como no `<main>` e nos resultados.
- O skip-link ganha um guard, não o foco: com erro ativo, o clique ignora a navegação (`preventDefault`) e põe o foco no `<main>` — o que a própria navegação por fragmento faria; sem erro, o comportamento atual fica intocado. O guard mora no `layouts/default.vue`, comentado lá com a cadeia que o exige: popstate → `afterEach` do router → `clearError` → refetch → 404 de novo.
- "Ver lista de clientes" navega à lista e põe o foco nos resultados, com o `focusResults()` de `resultsScroll.ts`; o clique com tecla modificadora, que abre outra aba, preservado.

## Consequências

- Entrar e sair da página de erro é anunciado, e o foco não cai no `<body>`: o título é o ponto de entrada na página de erro, e a lista pega o leitor nos resultados.
- O skip-link não limpa mais o erro, nem refaz a busca do cliente para lançar o 404 de novo.
- Comentários-gêmeos: `layouts/default.vue` (announcer, guard do skip-link), `layouts/default.module.scss` (navegação do skip-link), `error.vue` e `error.module.scss` (foco no título).
