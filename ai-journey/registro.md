# Registro

Uma entrada por issue fechada: o que foi decidido, como foi feito e o que saiu, com o que o review mudou. O detalhe fica na issue e no PR; aqui fica o rastro.

- **Decidido:** a issue (critérios de aceite) e as ADRs que ela cita.
- **Plano:** o plano aprovado, postado como comentário na issue. Até a #17 ele não foi registrado: existia só na conversa com o agente.
- **Como:** as decisões de implementação que o PR registrou.
- **Resultado:** o tamanho do PR (linhas do GitHub, com lockfile e fixtures) e o achado do review que mais pesou.
- **Pendente:** o que ficou para outra issue ou sem conferir.

## M1 · Fundação

### #1 · Scaffold do Nuxt 4 · [PR #46](https://github.com/adamsalves/customer-directory/pull/46)

- **Decidido:** [#1](https://github.com/adamsalves/customer-directory/issues/1) · ADR-0002, ADR-0016
- **Como:** Nuxt 4.6.1 com `app/` e SSR, TypeScript estrito com `noImplicitOverride` também no Nitro, TypeScript em `^6` porque o 7 quebra o `vue-tsc`. `AGENTS.md` e `CLAUDE.md` adiantados da #7.
- **Resultado:** +6698 −0. Review: o `engines.node: ">=24"` aceitava versões que o Nuxt recusa e incluía a 25, com que a Vercel subiria de major sozinha. Virou `^24.15.0`.

### #47 · pnpm → npm · [PR #48](https://github.com/adamsalves/customer-directory/pull/48)

- **Decidido:** [#47](https://github.com/adamsalves/customer-directory/issues/47) · ADR-0018
- **Como:** `package-lock.json` gerado com npm 11, nas mesmas versões diretas. O script de install do `esbuild` continua negado, agora por `allowScripts`. Histórico não reescrito.
- **Resultado:** +9272 −6553. Sem review registrado.

### #2 · ESLint com tipos, Prettier e Stylelint · [PR #49](https://github.com/adamsalves/customer-directory/pull/49)

- **Decidido:** [#2](https://github.com/adamsalves/customer-directory/issues/2) · ADR-0016, ADR-0003
- **Como:** regras `strict-type-checked`, `no-restricted-syntax` contra genérico usado como cast, `as` e `!` barrados no `<template>`, Stylelint com classes em PascalCase e cor só por token.
- **Resultado:** +4885 −217. Review: a tabela de prova só testava a forma canônica de cada regra; `$fetch.raw<T>()` e `as` no template passavam com 0 erros. Na config nova, os mesmos arquivos dão 11.

### #3 · husky, lint-staged e commitlint · [PR #50](https://github.com/adamsalves/customer-directory/pull/50)

- **Decidido:** [#3](https://github.com/adamsalves/customer-directory/issues/3) · ADR-0010
- **Como:** hooks de uma linha, sem `npx`; lint-staged só nos arquivos do commit.
- **Resultado:** +577 −1. Review: o commitlint trazia `@types/node` 26 por um peer, e o typecheck aceitava APIs que não existem no Node 24. Fixado em `^24.15.0`. Os globs do lint-staged deixavam `.css`, `.cjs`, `.mts` e `.yaml` passarem.

### #4 · Vitest e Playwright · [PR #51](https://github.com/adamsalves/customer-directory/pull/51)

- **Decidido:** [#4](https://github.com/adamsalves/customer-directory/issues/4) · ADR-0009
- **Como:** Vitest no ambiente `nuxt` com `fsModuleCache: false`, Playwright em desktop e mobile, sempre com build próprio na porta 3124.
- **Resultado:** +633 −4. Review: com `reuseExistingServer`, o E2E local passava contra um build velho (2 verdes com o h1 quebrado). A opção saiu.

### #5 · CI no GitHub Actions · [PR #52](https://github.com/adamsalves/customer-directory/pull/52)

- **Decidido:** [#5](https://github.com/adamsalves/customer-directory/issues/5) · ADR-0010
- **Como:** um job `ci` (lint → typecheck → test → e2e), cache do npm e dos browsers.
- **Resultado:** +63 −1. Review: o ramo de cache hit nunca tinha rodado, porque cache gravado num PR não chega na `main`. O install passou a rodar sempre. Também: `$(…)` vazio passava no `bash -e`.

### #6 · Deploy na Vercel · [PR #53](https://github.com/adamsalves/customer-directory/pull/53)

- **Decidido:** [#6](https://github.com/adamsalves/customer-directory/issues/6) · ADR-0012
- **Como:** integração Git nativa, sem `vercel.json`.
- **Resultado:** +4 −0. Review: o link de preview exigia login e nada avisava. A proteção ficou, com o aviso no README.

### #7 · ADRs, design e templates · [PR #54](https://github.com/adamsalves/customer-directory/pull/54)

- **Decidido:** [#7](https://github.com/adamsalves/customer-directory/issues/7) · ADR-0001, ADR-0013
- **Como:** protótipo em `docs/design/`, templates do GitHub, README e `ai-journey/`. Os HTML do protótipo marcados como gerados no `.gitattributes`.
- **Resultado:** +1053 −3. Review: os dois HTML do protótipo vinham de exportações diferentes, com tokens de contraste divergentes no tema claro.

## M2 · Shell + tema

### #8 · Tokens, estilos base e fontes · [PR #55](https://github.com/adamsalves/customer-directory/pull/55)

- **Decidido:** [#8](https://github.com/adamsalves/customer-directory/issues/8) · ADR-0003, ADR-0013, nova ADR-0019
- **Como:** 48 tokens por tema (a issue falava em 40; a contagem nos HTML decodificados deu 48), Roboto hospedada no app, `sass-embedded`, spec lendo o protótipo versionado.
- **Resultado:** +1199 −25, 445 linhas depois do review, acima do teto. Review: o spec de tokens comparava só os nomes, e uma cor errada passava; keyframes globais não funcionavam dentro de CSS Modules.

### #56 · "membros" → "clientes" · [PR #57](https://github.com/adamsalves/customer-directory/pull/57)

- **Decidido:** [#56](https://github.com/adamsalves/customer-directory/issues/56) · ADR-0006, ADR-0013, ADR-0017, nova ADR-0020
- **Como:** "cliente(s)" na interface e URL `/clientes`. As ADRs antigas não foram reescritas (ADR-0001). A URL virou `/customers` depois, na ADR-0021.
- **Resultado:** +34 −9. Sem review registrado.

### #9 · Layout com header e footer · [PR #59](https://github.com/adamsalves/customer-directory/pull/59)

- **Decidido:** [#9](https://github.com/adamsalves/customer-directory/issues/9) · ADR-0003
- **Como:** `<NuxtLayout>`, header sticky, footer, redirect 307 de `/` por `routeRules`.
- **Resultado:** +429 −23. Review: o header sticky cobria o alvo do skip link (WCAG 2.4.11). Correção com `scroll-padding-block-start` no `html`, provada em E2E.

### #58 · Breadcrumb · [PR #60](https://github.com/adamsalves/customer-directory/pull/60)

- **Decidido:** [#58](https://github.com/adamsalves/customer-directory/issues/58) · ADR-0003, ADR-0014
- **Como:** `AppBreadcrumb`, escondido no celular só por CSS.
- **Resultado:** +209 −1. Review: dois `aria-current="page"` na lista, porque o exact-active do router ignora a query. Só o E2E enxerga isso; o teste de componente troca o link por um stub.

### #10 · Dark mode por cookie · [PR #61](https://github.com/adamsalves/customer-directory/pull/61)

- **Decidido:** [#10](https://github.com/adamsalves/customer-directory/issues/10) · ADR-0011
- **Como:** cookie `jsm-theme`, `useTheme`, `data-theme` no `<html>` desde o SSR. 23 quebras plantadas, cada uma derruba um teste.
- **Resultado:** +397 −0. O review entrou no corpo do PR, não num comentário. Ele tirou o `aria-pressed` que o critério pedia: com o rótulo que alterna, o leitor de tela anunciava o tema errado (APG; desvio na ADR-0013).

### #11 · E2E do tema sem flash · [PR #62](https://github.com/adamsalves/customer-directory/pull/62)

- **Decidido:** [#11](https://github.com/adamsalves/customer-directory/issues/11) · ADR-0009, ADR-0011
- **Como:** primeira issue com medir → planejar → aprovar → implementar (a aprovação foi pulada e o fluxo, reforçado). Sistema escuro emulado e o rótulo do toggle como sinal de hidratação.
- **Resultado:** +140 −4. Review: o `sameSite: 'Lax'` do E2E não provava nada, porque o Playwright devolve `Lax` quando o atributo falta. A prova foi para o teste unitário.

## M3 · Listagem paginada

### #12 · Tipos, guards e fixture · [PR #63](https://github.com/adamsalves/customer-directory/pull/63)

- **Decidido:** [#12](https://github.com/adamsalves/customer-directory/issues/12) · ADR-0016, ADR-0009
- **Como:** o guard valida só o que o app lê. Payload fora do formato lança erro; um registro inválido isolado é descartado. Fixture com 20 registros reais.
- **Resultado:** +1045 −0. Review: com todos os registros inválidos, o parser devolvia `[]`, que gravaria a lista vazia no cache por 1h. Passou a lançar.

### #13 · Normalização · [PR #64](https://github.com/adamsalves/customer-directory/pull/64)

- **Decidido:** [#13](https://github.com/adamsalves/customer-directory/issues/13) · ADR-0006
- **Como:** `normalizeCustomer` puro, portado do protótipo; UF dos 27 estados.
- **Resultado:** +382 −18. Review: os testes de idade só pegavam `getUTC*` trocado por getter local fora de UTC, e o CI roda em UTC. Os testes passaram a fixar `TZ=America/Sao_Paulo`.

### #14 · BFF paginado com cache · [PR #65](https://github.com/adamsalves/customer-directory/pull/65)

- **Decidido:** [#14](https://github.com/adamsalves/customer-directory/issues/14) · ADR-0004, ADR-0005, nova ADR-0021
- **Como:** `defineCachedFunction` de 1h com SWR, `queryCustomers` puro, URL da fonte trocável em runtime. URLs em inglês (`/clientes` → `/customers`).
- **Resultado:** +462 −45. Review: uma fonte vazia ainda apagava o cache. E um conserto do próprio PR (`event.waitUntil`) não protegia nada no Nitro 2.13.

### #66 · CustomerCard · [PR #68](https://github.com/adamsalves/customer-directory/pull/68)

- **Decidido:** [#66](https://github.com/adamsalves/customer-directory/issues/66) · ADR-0003, ADR-0014
- **Como:** uma marcação só, o CSS decide o layout; nome em `<h2>` e hover só com `(hover: hover)`, os dois na ADR-0013.
- **Resultado:** +306 −18. Review: sem defeito no código. A garantia de acessibilidade do `display: none` não tinha teste, porque o happy-dom não aplica media query. O E2E por largura virou critério da #18, que não o pedia.
- **Pendente:** o E2E por largura (#18). `<a>` envolvendo `<article>` fica sem nome acessível no Chrome; o padrão do link virou critério da #35.

### #15 · Lista de cards pela URL · [PR #69](https://github.com/adamsalves/customer-directory/pull/69)

- **Decidido:** [#15](https://github.com/adamsalves/customer-directory/issues/15) · ADR-0007, ADR-0014, ADR-0017
- **Como:** `useListQuery` é o único que lê e escreve a query; `useFetch` sem genérico; os 4 primeiros avatares carregam sem lazy loading.
- **Resultado:** +260 −9. Review: o E2E passou a buscar dados no S3, contra a ADR-0009. O Playwright agora sobe uma fonte local com a fixture.

### #67 · Skeletons · [PR #70](https://github.com/adamsalves/customer-directory/pull/70)

- **Decidido:** [#67](https://github.com/adamsalves/customer-directory/issues/67) · ADR-0014
- **Como:** sempre 9 skeletons, numa lista com `aria-busy` e o rótulo "Carregando clientes".
- **Resultado:** +185 −5. Review: sem defeito no código. O layout por largura não tinha teste, e o mutante que usava o `perPage` como contagem sobrevivia.

### #16 · Paginação e itens por página · [PR #73](https://github.com/adamsalves/customer-directory/pull/73)

- **Decidido:** [#16](https://github.com/adamsalves/customer-directory/issues/16) · ADR-0007
- **Como:** algoritmo de páginas do protótipo, com uma lacuna de uma página trocada pelo número; links em vez de `<button>`; a nav fica montada durante a carga.
- **Resultado:** +659 −1, acima do teto por exceção. A rolagem e o foco saíram para a #71 e a #72. Review: o pior caso de largura estava errado. `1 2 3 4 5` mede 308px, e não `1 2 3 … 23`.

### #71 · Rolar até os resultados · [PR #74](https://github.com/adamsalves/customer-directory/pull/74)

- **Decidido:** [#71](https://github.com/adamsalves/customer-directory/issues/71) · ADR-0014, nova ADR-0022
- **Como:** hook do router (`afterEach`) em vez de `scrollBehavior`.
- **Resultado:** +336 −1 (a estimativa era +264). Review: trocar os itens por página pelo teclado tirava o select da tela. Agora só rola quando a página muda com o mesmo tamanho.

### #72 · Foco nos resultados · [PR #75](https://github.com/adamsalves/customer-directory/pull/75)

- **Decidido:** [#72](https://github.com/adamsalves/customer-directory/issues/72) · ADR-0022
- **Como:** uma `<section>` que guarda skeleton e lista recebe o foco; ancoragem manual do select ao trocar os itens por página.
- **Resultado:** +381 −68, 391 linhas na abertura e 449 depois do review. Review: a ancoragem desfazia a rolagem do leitor durante a carga. Ela passou a ser esquecida no primeiro `wheel`, `pointerdown` ou `keydown`.
- **Pendente:** Safari real e leitor de tela.

### #17 · Estado de erro com retry · [PR #76](https://github.com/adamsalves/customer-directory/pull/76)

- **Decidido:** [#17](https://github.com/adamsalves/customer-directory/issues/17) · ADR-0005, ADR-0022
- **Como:** 502 no handler, e não em `fetchCustomers`, para o SWR seguir servindo a cópia antiga; componente `ErrorState`; o retry leva o foco aos resultados.
- **Resultado:** +338 −20 (eram +206 −13 antes do review). Review: o 502 fazia o ofetch repetir o GET sozinho, dobrando as leituras do S3 e o tempo até o erro. Mais 6 achados.
- **Pendente:** leitor de tela e Safari reais.

### #77 · Registro por issue no ai-journey · [PR #78](https://github.com/adamsalves/customer-directory/pull/78)

- **Decidido:** [#77](https://github.com/adamsalves/customer-directory/issues/77) · sem ADR
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/77#issuecomment-6348474688) · estimativa ~170 linhas
- **Como:** arquivo separado do `prompts.md`, que é curado; entradas tiradas dos PRs e das issues, sem reconstruir os planos antigos; a entrada vai no próprio PR, antes do merge.
- **Resultado:** +175 −1. Mergeado sem review.

### #18 · E2E da lista paginada · [PR #79](https://github.com/adamsalves/customer-directory/pull/79)

- **Decidido:** [#18](https://github.com/adamsalves/customer-directory/issues/18) · ADR-0009, sem ADR nova: a segunda instância do app é só infraestrutura de teste
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/18#issuecomment-6348796907) · estimativa ~280 linhas
- **Como:** o fluxo e a URL direta ficam em `customerList.spec.ts`; o que depende da largura, em `customerListLayout.spec.ts`: colunas pelo `x` dos cards, hover só no desktop (o toque não casa `(hover: hover)`) e o skeleton medido com `/api/customers` preso. O erro vindo do SSR pede uma fonte que cai e volta: o `fixtureSource` ganhou `/flaky/<n>.json`, e o próprio teste sobe uma instância do app (mesmo `.output`, cache vazio) que lê dela, com porta e chave por worker. Esse teste roda só no desktop e sem retry, com trace guardado na falha.
- **Resultado:** +367 −18 (estimativa ~280, com o fechamento do M3 no `ai-journey/`). 11 quebras plantadas (as 7 do plano e mais 4), cada uma derrubou ao menos um teste novo. Review (`/code-review`, 9 achados, nenhum bug no app): a segunda instância era uma 3ª entrada de `webServer`, que dependia da ordem de subida e, no `--ui`/`--repeat-each`, achava o cache cheio e falhava sem regressão; virou instância subida no teste. Na prova com `--repeat-each`, as repetições rodaram em paralelo e colidiram na porta (`EADDRINUSE`), daí porta e chave por worker. Também: skip por `isMobile` no lugar do nome do projeto, `networkidle` antes de conferir que não houve requisição, `trace: 'retain-on-failure'` (com `retries: 0` o `on-first-retry` nunca gravava) e o link e o select por `data-testid`.
- **Pendente:** layout rodando também no projeto mobile (repete as larguras do desktop) e locators repetidos entre specs, apontados no review e deixados fora.

## M4 · Busca

### #80 · Breadcrumb "Clientes" · [PR #81](https://github.com/adamsalves/customer-directory/pull/81)

- **Decidido:** [#80](https://github.com/adamsalves/customer-directory/issues/80) · ADR-0013, ADR-0020 (o breadcrumb deixa de ser exceção)
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/80#issuecomment-6365890798) · estimativa ~20 linhas
- **Como:** troca do rótulo e dos specs que esperavam "Usuários"; a linha de desvio da ADR-0013 foi reescrita sem mudar a largura da tabela, para não reformatar as outras linhas.
- **Resultado:** +18 −8. Mergeado sem review; o preview mostrou que o roteiro do PR errava ao dizer que a trilha da lista some no mobile.
- **Pendente:** breadcrumb do detalhe (#35) e textos com "membro" das #34 e #38; protótipo em `docs/design/` no M9.

### #19 · Busca por nome no BFF

- **Decidido:** [#19](https://github.com/adamsalves/customer-directory/issues/19) · ADR-0004, ADR-0007, ADR-0021, sem ADR nova: a regra de busca é a do protótipo e a chave da URL segue a ADR-0021 (`search`, não `busca`)
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/19#issuecomment-6366729457) · estimativa ~150 linhas
- **Como:** `IListQuery` ganha `search` (`''` por padrão). O parser aceita só `string` e apara (o campo da #20 guarda o próprio rascunho); o serializador deixa `''` fora da URL. `queryCustomers` filtra antes de paginar, então `total`, `totalPages` e o clamp contam só o que casou. A dobra de acento e de caixa saiu do `slugify` para o `foldText`, que a busca e o slug usam.
- **Resultado:** +273 −57. 20 quebras plantadas, cada uma derrubou ao menos um teste, menos o filtro de palavras vazias e o `return` da busca em branco: `''` está em todo nome, então nenhum dos dois mudava a saída (200 mil buscas aleatórias deram o mesmo resultado sem eles). Saíram do código. O review (`/code-review`) mudou quatro coisas: o parser passou a aparar, porque `?search=ana%20` e `?search=ana` eram dois estados (busca repetida, entrada nova no histórico); o `pageChanged` passou a comparar todo o estado menos a página, já que o `ponytail:` dele pedia isso quando `search` existisse, e Voltar de `?page=2` para `?search=ana` rolava a tela e tirava o foco do campo; a página manda ao BFF só as chaves fora do padrão (`serializeListQuery`), sem `search=` vazio; e entraram testes de acento codificado e de `+`/`%20` passando pelo `getQuery`. Um segundo review mudou mais cinco: o `return` da busca em branco voltou, porque sem ele a listagem sem busca, a chamada mais comum, dobrava os 200 nomes à toa (a mutação não pegou porque a saída é a mesma; o teste agora conta as chamadas a `normalize`); o parser corta a busca em 100 caracteres, já que cada palavra é comparada com cada nome sem cache; o `foldText` passou de NFD para NFKD e lê letras de largura cheia (`ｅｌｅｕｔｅｒｉｏ`); a comparação de estado virou `sameListState`, usada pelo `useListQuery` e pelo `pageChanged`; e o caso de teste que simulava Voltar passou a descrever o que o `pageChanged` vê. Ficaram de fora a dobra dos nomes uma vez só, no cache, e a aspa curva (`d’avila`).
- **Pendente:** o campo de busca (#20), que guarda o rascunho e grava o valor aparado. Chaves em pt-BR que sobraram no corpo das ADR-0007 e ADR-0017.

### #83 · Paginação compacta com até 5 páginas

- **Decidido:** [#83](https://github.com/adamsalves/customer-directory/issues/83) · ADR-0013 (uma linha mudada e outra nova na tabela de desvios), sem ADR nova
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/83#issuecomment-6373389714) · estimativa ~60 linhas
- **Como:** o espaçamento da nav (12px e 4px) zera abaixo de 348px de container, e não mais de 328px. Abaixo de 308px de container, setas e números deixam de ser 44px e passam a um sétimo dele (`min(44px, 100cqi / 7)`, dentro do `@media (width < 960px)`): 41,1px a 320px, 35,4px a 280px, e os 7 alvos sempre cabem. O `cqi` é lido onde a variável é usada, sob o `.Root`, e os limites vêm das variáveis Sass `$target`, `$nav-gap`, `$list-gap` e `$compact-max`, não de números calculados à mão. O E2E intercepta `/api/customers` e devolve `totalPages` de 2 a 5, com a última página como atual; numa carga por largura, a 280, 320, 360 e 375px, troca a rota, clica numa página que não é a atual e confere `x ≥ 16`, `x + largura ≤ viewport − 16` e o tamanho da seta e de um link (largura e altura) contra `min(44, (viewport − 32) / 7)`. Um teste a 1280px estreita o container a 280px e confere os alvos de 32px e os espaços. O teste do `1 … 23` ficou, com os mesmos helpers.
- **Resultado:** +138 −28 (estimativa ~60). O código anterior falha nos testes novos a 280px, a 320px (alvo de 40px, e não de 41,1px) e no container estreito a 1280px. 11 quebras plantadas, 10 derrubaram ao menos um teste: apagar o `min()` de `--pg-size` ou o de `--pg-height`, trocar o `min()` por 44px, dividir por 8 e não por 7, apagar a regra dos espaços, descer o limite dos espaços para 324px, tirar a condição de 960px, tirar o `container-type` do `.Root`, e apagar o `gap` do `.Nav` ou o do `.List` (estes dois só o teste de 1280px derruba, pela largura da nav com e sem espaços). Subir o limite dos espaços para 360px sobrevive: nenhum teste tem um container entre 348px e 360px. Review (8 achados): o E2E media só a seta, e passou a medir também um link de página, largura e altura; a regra dos 40px não estava presa a `< 960px` e aumentava os alvos de 32px num container estreito; os limites, calculados à mão, viraram variáveis Sass; abaixo de 280px de container 7 × 40px ainda estouravam os gutters, e os alvos passaram a um sétimo do container, com 280px no E2E; a resposta falsa de 3 páginas com a página 2 atual era igual à da fixture, e a atual passou a ser a última; o teste do `1 … 23` e o describe repetiam a rota falsa e a checagem dos gutters, que já divergiam (`x ≥ 0` contra `x ≥ 16`), e passaram a usar dois helpers; 12 `goto` viraram 4; e o número de linhas desta entrada, que estava em +66 com o PR em +72. Na implementação, a rota falsa passou a casar também `/api/customers` sem `?` (a página 1 pede sem query) e o clique alterna entre a página 2 e a 1, porque um link para a página em que a URL já está não pede nada. Por fim, o teste do `1 … 23` passou a esperar a hidratação antes da rota falsa (sem ela, um clique cedo vira navegação respondida pelo servidor) e a ADR-0013 diz que as listas cabem a partir de 280px.
- **Pendente:** a conferência visual no preview, nos dois temas, a 280, 320, 360 e 375px.

### #20 · Campo de busca no header

- **Decidido:** [#20](https://github.com/adamsalves/customer-directory/issues/20) · ADR-0007, ADR-0013 (três linhas novas: debounce de 300ms, histórico com replace na lista e push fora dela, e a pílula do logo só na imagem), ADR-0014, sem ADR nova. O critério da paginação compacta saiu para a #83, e o PR passou do teto de ~400 linhas como exceção aprovada duas vezes, a segunda depois do review; quase tudo é teste.
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/20#issuecomment-6416231049) · estimativa ~340 linhas
- **Como:** o `SearchField` fica entre o logo e o toggle e guarda o próprio rascunho; a URL recebe o valor aparado. Cada tecla reinicia uma espera de 300ms; Enter, Esc e × gravam na hora. Uma busca nova volta à página 1, e a mesma busca mantém a página. Na lista, uma gravação que não muda nada é pulada, porque o `pageChanged` a tomaria por troca de página e tiraria o foco do campo. Também na lista, a entrada do histórico é substituída; vindo de outra rota, é acrescentada. O `/` foca o campo de qualquer lugar, menos de um campo de texto ou com Ctrl, Meta ou Alt. O hint `kbd` aparece com o campo vazio, a partir de 960px, só por CSS. O `setQuery` ganhou `{ replace }` e passou a mandar sempre para `/customers`. O `refDebounced` planejado não existe: o timer ficou no componente, disparado pelo `@input`, para que o rascunho reescrito por voltar/avançar não vire gravação. O `maxlength` vem de `MAX_SEARCH_LENGTH`. É o primeiro spec do repo com fake timers, e só para `setTimeout` e `clearTimeout`: o plugin `navigation-repaint` do Nuxt espera um frame a cada navegação.
- **Resultado:** +1060 −6 (estimativa ~340; código +208, scss +124, specs unitários +628, E2E +89). Mutação: 71 de 71 mortos nos specs unitários. No CSS, 78 mutantes com a suíte E2E, 17 mortos: os testes novos de layout travam o hint (959/1280), o input (48/44) e o logo (272 a 960). O restante é aparência, conferida contra o protótipo no navegador. A conferência do implementer achou três coisas antes do PR: digitar um espaço no fim na página 2 voltava à página 1 e tirava o foco do campo, e a mesma busca passou a manter a página; acima de 100 caracteres a URL guardava o texto inteiro e o campo era cortado, e entrou o `maxlength`; e o CSS só tinha medida manual, e entraram os E2E de layout. O review (`/code-review`, 9 achados, 8 aplicados) mudou: a pílula clara do logo no tema escuro esticava junto com a coluna de 272px, porque a largura estava no próprio link (como no protótipo); o dono decidiu que a pílula é só do logo, a coluna foi para um grid no header a partir de 960px e a busca deixou de começar 12px mais à esquerda no escuro; uma tecla digitada enquanto a navegação da gravação anterior ainda não tinha chegado sumia do campo, e o campo passou a guardar a busca em voo (`pending`), o que também evita a navegação duplicada de um Enter logo depois da espera; a espera é cancelada quando a rota sai da lista; fora da lista, busca vazia não navega; o Esc respeita `isComposing` (tecla morta, IME); o `/` passou a valer com o foco em checkbox, radio e outros inputs que não recebem texto; e o input ganhou `aria-keyshortcuts="/"`. Ficou de fora o `.VisuallyHidden` repetido do PaginationNav (duas cópias, sem utilitário global). Mutação final: 95 de 95 nos specs unitários; no CSS do header, 11 de 13 (sobrevivem `flex` no item de grid, que o grid ignora, e `minmax(0, 1fr)` → `1fr`, equivalente com o `min-inline-size: 0` da busca).
- **Pendente:** buscar a partir do detalhe e o E2E da espera cancelada ao sair da lista (#36); E2E do fluxo de busca, do hint e do histórico (#22); destaque do termo, chip "Busca" (#25) e visual final (#43).

### #21 · Estado vazio contextual

- **Decidido:** [#21](https://github.com/adamsalves/customer-directory/issues/21) · ADR-0013 (uma linha nova: o foco vai para os resultados depois de "Limpar busca e filtros", e o protótipo não o move), ADR-0022 (o botão entra como mais um caso de foco nos resultados), sem ADR nova. A #29 ganhou o critério de que, com zero resultados, o `aria-live` diz "Nenhum cliente encontrado".
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/21#issuecomment-6441014361) · estimativa ~250 linhas
- **Como:** o `EmptyState` recebe a busca e emite `clear`. A dica é um `computed` que por enquanto só tem o caso "só busca"; a #25 acrescenta os casos com filtro. Com `total === 0`, ele entra no `#results` no lugar da lista, e a paginação só aparece com `total > 0`. O botão leva o foco aos resultados e grava `{ ...query, search: '', page: 1 }` com `replace`: o `perPage` se mantém e voltar não repassa pela busca vazia. O `SearchField` esvazia sozinho quando a URL perde o `search`. O visual repete as medidas e os tokens do protótipo. O caso "Ainda não há clientes cadastrados" ficou de fora porque a fonte nunca chega vazia.
- **Resultado:** +292 −8 sem este registro (eram +291 −7 antes do review; estimativa ~250; código e scss +123, ADRs +2, specs unitários +138, E2E +29). Mutação: as 7 checagens do plano derrubam ao menos um teste cada (o `total > 0` da paginação, o `focusResults`, o `replace`, o `perPage` mantido, o `page: 1`, a busca na dica e a troca da lista pelo vazio). A conferência do implementer achou um termo longo sem espaço (um e-mail, ou 100 letras) estourando a dica e rolando a página de lado a 320 e 375px, o mesmo defeito do protótipo; entrou `overflow-wrap: anywhere` e um E2E a 320 e 375px que falha sem a regra. Review (`/code-review`, 6 achados, 2 aplicados): o comentário do `.Results:focus` dizia que os resultados só recebem foco numa troca de página, e agora cita também o retry e o limpar; o `<svg>` do `EmptyState` perdeu o `aria-hidden`, que o `<span>` em volta já tem. Recusados 4: o estado vazio sem anúncio ao leitor de tela (fica para a #29, que já tem o critério, e a lista vazia antes tampouco era anunciada); centralizar o foco numa parte só da página, em vez de um `focusResults()` em cada botão (são só 2 casos, retry e limpar; os links dos cards da #35 saem da página e os filtros da #25 ficam fora do `#results`; vale rever se surgir um 3º botão dentro dos resultados); o SCSS repetido com o `ErrorState` (borda, fundo, ícone e cores do botão diferem, e um mixin serviria a umas 15 linhas de layout); a dica com `search` vazio (inalcançável hoje, porque a fonte nunca chega vazia, e o comentário do `computed` já remete à #25).
- **Pendente:** E2E do fluxo de busca sem resultado e de "Limpar" (#22); contagem com `aria-live` (#29); casos da dica com filtros (#25); visual final (#43).

### #22 · E2E do fluxo de busca

- **Decidido:** [#22](https://github.com/adamsalves/customer-directory/issues/22) · ADR-0009 (cada milestone de feature termina com o E2E dela), sem ADR nova: só testes, o app não mudou.
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/22#issuecomment-6442452407) · estimativa ~130 linhas
- **Como:** `search.spec.ts` novo, nos dois projetos (o do `/` só no desktop, porque a dica aparece a partir de 960px), contra a fixture real e sem `page.route`. Quatro testes: `girao rosa` acha só "Girão da Rosa", e recarregar mantém o card e o campo preenchido depois da hidratação; `girao jesus` (cada palavra casa com alguém, as duas juntas com ninguém) mostra o estado vazio, e "Limpar busca e filtros" volta aos 9 cards, com a URL sem `search` e o campo vazio; o `/` foca o campo sem ser digitado, e a dica fica enquanto o campo está vazio (focado ou não) e some com a primeira letra; da página 2, `g`, `i`, `r` com o teclado no campo e `goBack()` caindo em `/customers`, não em `?search=gi`. Cada letra espera a URL gravada, porque digitadas juntas virariam uma gravação só e o histórico não teria letras para pular. Todos esperam a hidratação antes de digitar, já que antes dela o campo não escuta (o `waitForHydration` pede o sistema escuro). O caso de 375px entrou no laço da dica do `customerListLayout.spec.ts`, que roda nos dois projetos.
- **Resultado:** +104 −0 sem este registro (estimativa ~130; spec novo +103, layout +1). Mutação: as 4 do plano derrubaram só o teste previsto. `replace: false` no `SearchField` derrubou o do histórico (a URL ficou em `?search=gi`), tirar o `foldText` do BFF o da busca sem acento (0 cards, esperava 1), quebrar o `emit` do `EmptyState` o do "Limpar" (0 cards, esperava 9) e o `/` sem efeito o do atalho (`toBeFocused`). Mais 4, para as asserções que essas não alcançam: sem o `preventDefault` do `/` o campo recebe "/", com a dica sempre renderizada ela não some (`toBeHidden`), com o rascunho começando vazio o card vem depois do reload e o campo não, e com o campo sem acompanhar a URL ele fica com o texto depois do "Limpar". Review (`/code-review`): 6 de 8 aplicados. (1) O teste do histórico clicava no campo sem esperar o foco ir para os resultados um frame depois da troca de página, que podia roubá-lo da primeira letra; agora espera o `#results` focado. (2) `girao rosa` não distinguia "todas as palavras" de "qualquer uma" ou "só a primeira", porque nenhuma outra pessoa tem "girao" ou "rosa". O vazio passou a usar `girao jesus`, e as duas mutações no BFF agora derrubam esse teste. (3) A ADR-0009 pede desktop e mobile 375px, então o skip do arquivo caiu. (4) `waitForHydration` depois do reload: sem ele, o campo preenchido passava só com o HTML do servidor. (5) A URL da busca virou exata, `'/customers?search=girao+rosa'`. (6) Saiu a checagem da dica a 1280px antes do `/`, que repetia o laço do layout. Recusado: juntar `cards` e `pageTwoLink` num módulo comum, porque um testid trocado zera o locator e o teste falha alto, sem selecionar o elemento errado em silêncio. Estabilidade: `--repeat-each=5` nos dois projetos (35 passam, 5 do `/` no mobile puladas). Suíte E2E inteira: 123 passam e 9 são puladas. `npm test` (456), `npm run lint` e `npm run typecheck` limpos.
- **Pendente:** contador de resultados (#29) e estado vazio com filtros (#25), fora do escopo.

## M5 · Filtros

### #23 · Filtro por estado e gênero no BFF, com contagens

- **Decidido:** [#23](https://github.com/adamsalves/customer-directory/issues/23) · ADR-0004 (o `facets` da resposta), ADR-0007, ADR-0021 (`states` e `gender` na URL), sem ADR nova: a regra dos filtros e das contagens é a do protótipo. O PR passou do teto de ~400 linhas como exceção aprovada; quase tudo é teste.
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/23#issuecomment-6444111271) · estimativa ~290 linhas
- **Como:** `IListQuery` ganha `states` (`[]` por padrão) e `gender` (`'all'`). O parser divide `states` por vírgula e mantém só slugs de `BRAZILIAN_STATES`, na ordem da tabela. Com isso, `bahia,sao-paulo,bahia` e `sao-paulo,bahia` viram o mesmo estado da lista, e a lista para em 27. Chave repetida vira `[]`, e gênero desconhecido vira `'all'`. O `serializeListQuery` passa os estados pela mesma regra e deixa `[]` e `'all'` fora da URL. O `sameListState` compara o que cada estado da lista escreve na URL, então estados escolhidos em qualquer ordem são o mesmo conjunto, e o `ponytail:` que pedia isso na #23 saiu. O `ICustomer` guarda o `stateSlug`, que o `normalizeCustomer` já calculava, e o card não o leva. No `queryCustomers`, a busca vem primeiro, depois o gênero e os estados (OR entre estados, AND entre os três), e só então a paginação. `facets.states` traz os 27 slugs, inclusive os zerados, contados sobre busca + gênero. `facets.gender` (`all`, `female`, `male`) é contado sobre busca + estados. Assim, cada contagem deixa de fora o filtro a que pertence, como no protótipo. `DEFAULT_STATE_SLUGS` (os 5 que o painel sempre mostra) é conferido contra o `DEFAULT_STATES` do protótipo.
- **Resultado:** +624 −100 sem este registro (eram +600 −92 antes do review; estimativa ~290; linhas tocadas: código 125, specs 599). Os specs cresceram por dois motivos. Os literais de `IListQuery` e da resposta em cinco specs tiveram de ganhar as chaves novas. E os casos de filtro foram escolhidos para que AND, OR e "só o primeiro filtro" deem totais diferentes. Mutação: 57 mutantes, todos mortos. Entre eles: whitelist, ordem e dedupe dos estados; validação do gênero; omissões do serializador; base de cada contagem; os 27 zerados; contagem da lista inteira, não da página; `stateSlug` vazando no card. O handler sem `states` ou `gender` só cai no spec da API, que passa pelo `getQuery` real com vírgula literal e com `%2C`. Antes do PR, o serializador escrevia os estados na ordem em que chegavam, com um `ponytail:` para a #24. Agora ele aplica a regra do parser, porque todo link passa por ali, e entrou um teste que falha sem isso. Review (`/code-review`, 8 achados, 5 aplicados):
  1. Com os filtros indo para o BFF, um link só com filtro (`?states=sao-paulo`) podia dar zero resultados, e "Limpar busca e filtros" limpava só a busca. A URL não mudava e a lista ficava vazia. O botão agora zera também `states` e `gender`, e o teste do limpar parte de uma URL com filtros e falha sem isso. A dica com filtro fica para a #25, que tem o critério.
  2. O cache `customers` do Nitro tinha o mesmo nome e a mesma integridade, então a cópia em disco do dev (que sobrevive ao restart) servia por até 1h clientes sem `stateSlug`, e o filtro de estado não achava ninguém. O cache ganhou `integrity: 'customer-2'`, com um comentário para subir o valor quando o formato do `ICustomer` mudar. Em produção o cache é em memória e cada deploy começa limpo. Não tem teste, porque teria de semear o cache em disco antes do build.
  3. O `sameListState` comparava em ordem e confiava que os estados já chegariam ordenados. Um painel que montasse `['sao-paulo', 'bahia']` na ordem do clique daria "estados diferentes" para a mesma escolha. Agora ele compara o que cada estado escreve na URL, e entrou um teste que falha com a comparação antiga.
  4. Parse e serialize passaram a usar o mesmo `inTableOrder`, sem montar uma string só para dividi-la de novo.
  5. O `queryCustomers` deixou de filtrar os estados duas vezes: o resultado é o gênero aplicado sobre o filtro de estados.

  Recusados 3:
  - Cliente de estado fora dos 27 sem filtro nem contagem: são 0 casos na fixture e nos 200 da fonte, e o comentário do `countFacets` registra o caso.
  - Slugs tipados como união em vez de `string`: o `Object.fromEntries` dos 27 só vira `Record<TSlug, number>` com `as`, que a ADR-0016 proíbe, e o parser e o serializador já descartam slug desconhecido.
  - `DEFAULT_STATE_SLUGS` sem uso fora do spec: é critério desta issue.

- **Pendente:** painel e "Limpar filtros" (#24); chips e dicas do EmptyState com filtros (#25); sheet mobile (#26); E2E dos filtros (#27).

### #24 · Painel de filtros · [PR #89](https://github.com/adamsalves/customer-directory/pull/89)

- **Decidido:** [#24](https://github.com/adamsalves/customer-directory/issues/24) · ADR-0007, ADR-0013 (seis desvios novos), ADR-0014, ADR-0015, ADR-0022 (o "Limpar filtros" entra na regra de foco), sem ADR nova. Um PR só, com commits por etapa, como exceção aprovada ao teto de ~400 linhas.
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/24#issuecomment-6445783374) · estimativa ~560 linhas
- **Como:** o `FilterPanel` não tem largura nem moldura, para a #26 reaproveitá-lo no `<dialog>`. Ele lê e grava a URL pelo `useListQuery`, recebe `facets` (que pode vir `undefined`) e emite `clear`. Por Estado: checkboxes nativos com os 5 padrão e depois os marcados, na ordem da tabela; "Ver todos (27)" abre os outros 22 (disclosure com `aria-expanded` e `aria-controls`). Por Gênero: rádios nativos com `name` do `useId()`, já que duas instâncias na página juntariam os grupos. Cada escolha grava com `push` e volta à página 1. Cliques seguidos antes de a URL mudar partem da escolha em voo (`pending`), a mesma armadilha do campo de busca. A página ganhou o grid `272px minmax(0, 1fr)` a partir de 960px, com o `<aside aria-label="Filtros">`, e o `.VisuallyHidden` virou classe global no `base.scss`. Os desvios na ADR-0013: esmaecido por `--text-muted` (5,83:1) em vez de `opacity: .45` (2,58:1); contagem lida como texto oculto "N clientes" em vez de `aria-label` num `span`; desmarcar um estado fora dos 5 com a lista recolhida leva o foco a "Ver todos"; `aria-controls` no toggle; o foco vai aos resultados depois do "Limpar filtros"; `push` em vez de `replaceState`.
- **Resultado:** +1242 −87 sem este registro (estimativa ~560; código 402, specs 833, docs 7). O implementer entregou +1286 em 8 commits, e os testes sobrepostos foram enxugados depois (de 42 para 28 no componente). Mutação: 81 de 81 nos specs unitários; no CSS, 80 de 86, e os 6 vivos eram partes redundantes da receita do `.VisuallyHidden`. Review (`/code-review`, 10 achados, 2 aplicados):
  1. O `:checked` só leva a URL para a caixa, e o Vue só reescreve `checked` quando o valor do vnode muda. Uma escolha cancelada no caminho (breadcrumb, Voltar, espera da busca) deixava a caixa marcada com a lista sem filtro, e o clique seguinte acrescentava o estado em vez de tirar. Quando o `setQuery` resolve com falha e era a última escolha do painel, os controles voltam ao que a URL diz. Dois testes cancelam a escolha com um push da URL atual e falham sem a correção. Uma asserção no meio do teste de cliques seguidos mata o mutante sem o `pending === next`.
  2. `SearchField` e `PaginationNav` passaram a usar o `.VisuallyHidden` global, e as duas cópias dos módulos saíram.

  A disputa entre escritas em voo de componentes diferentes (a busca grava a partir da URL velha e cancela a escolha do painel) virou a [#90](https://github.com/adamsalves/customer-directory/issues/90): a correção é guardar o estado em voo no `useListQuery`, e este PR já estava acima do teto. Recusados 7: foco no "Ver todos" mesmo com a navegação falhando (desvio aprovado; com a correção 1 só sobra o caso cancelado); rejeição do `.finally` sem tratamento (o app não tem guard que lance); contagens antigas durante o carregamento (escondê-las faria o painel pular a cada clique); a marcação da contagem repetida nos dois grupos (dois casos só); `hasFilter` repetindo os padrões do `listQuery.ts`; o tamanho do PR (exceção aprovada); este registro, que já estava previsto. Conferido no preview a 1280px, nos dois temas e contra o protótipo: os 6 itens do roteiro e a escolha cancelada. Ali apareceu o estado vazio com busca + filtro dizendo "Não encontramos ninguém chamado “nunes”" quando há Nunes, só não mulheres na Bahia. Fica para a #25, que tem o critério e vem logo depois deste PR, antes da release do M5.

- **Pendente:** dicas do EmptyState com filtros e chips (#25, a seguir); sheet mobile (#26); E2E dos filtros (#27); escritas em voo entre componentes (#90). Leitor de tela e Safari não conferidos.

### #90 · Gravações da lista em voo · [PR #91](https://github.com/adamsalves/customer-directory/pull/91)

- **Decidido:** [#90](https://github.com/adamsalves/customer-directory/issues/90) · ADR-0007, ADR-0023 (nova: o estado em voo vive por router dentro do `useListQuery`). Feita antes da #25 porque remover um chip também grava na URL, e os chips nasceriam com o mesmo defeito. O dono aprovou passar do teto de ~400 linhas depois do review.
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/90#issuecomment-6468720406) · estimativa ~220 linhas
- **Como:** o `useListQuery` guarda a gravação que a URL ainda não tem num `shallowRef` dentro de um `WeakMap` chaveado pelo router: um por requisição no servidor, um só no navegador. O `setQuery` recebe só o que muda e soma ao que está em voo, ou à URL quando nada está. Ele guarda o resultado como em voo e o solta quando a navegação termina, se ainda for o mais recente. Um `replace` feito sobre um `push` em voo sai como `push`. O novo `pending()` expõe esse estado. O `FilterPanel` perdeu o `pending` próprio e devolve os controles ao que a URL diz quando nada mais está em voo. O "Limpar", a troca de itens por página e os links da paginação partem do estado em voo. O `SearchField` manda só `{ search, page }` e guarda uma marca privada da busca que gravou, só para reconhecer a chegada dela. Essa marca é um desvio aprovado do critério "sem `pending` próprio": o estado em voo continua no `useListQuery`.
- **Resultado:** +678 −80 sem este registro (estimativa ~220; antes do review eram +328 −67). Mutação: 17 de 18 antes do review, e 25 de 28 nas correções. Os 3 vivos são o `flush: 'post'` trocado por `'pre'` ou removido (equivalentes: o render e o `syncControls` escrevem o mesmo `checked`) e uma variante da regra de esquecer a marca na falha, que só difere partindo de um campo desatualizado. O isolamento por router entre requisições no servidor não tem teste: só um teste com dois apps pegaria. No primeiro desenho, o campo de busca ignorava a chegada enquanto o debounce corria, e o E2E de busca pegou que isso ignorava o "Limpar". Review (`/code-review`, 9 achados, 8 aplicados):
  1. Uma busca (`replace`) sobre uma escolha (`push`) em voo apagava do histórico o estado anterior à escolha. Agora ela herda o `push`.
  2. Uma escolha cancelada pelo "Limpar" no mesmo quadro deixava a caixa marcada com a URL sem o estado. O painel agora ressincroniza quando nada mais está em voo, e não só na falha da própria navegação.
  3. Digitar e clicar em "Limpar" antes do fim da espera de 300 ms fazia o campo ignorar a limpeza, e a busca antiga voltava. A regra pelo timer deu lugar à marca privada da busca gravada.
  4. Os links da paginação montavam a URL a partir da rota e descartavam uma escolha em voo. Agora partem do estado em voo.
  5. Vindo de outra página, a rota global do Nuxt só sincroniza quando a página nova resolve, depois do fim da gravação, e a tecla digitada depois do commit sumia. A marca, esquecida só na chegada ou na falha, tirou essa dependência sem código a mais. Um teste com rota atrasada prova o caso.
  6. Uma escolha que outro escritor levava, e que um Voltar cancelava depois, deixava a caixa marcada. A regra do item 2 cobre esse caso.
  7. Um "Limpar" que levava o novo `perPage` descartava a âncora do seletor (#72). A âncora agora fica quando a gravação em voo leva o mesmo `perPage`.
  8. O `SearchField` montava o estado inteiro e o `setQuery` somava de novo. Ele passou a mandar só o que muda.

  Recusado 1: estado em voo vazando entre testes que terminam com uma gravação pendente. O estado se limpa quando a navegação termina, e as suítes rodaram 10 vezes sem falha.

- **Pendente:** dois casos de um quadro, não alcançáveis à mão: duas trocas do seletor no mesmo quadro descartam a âncora da segunda; e o "Limpar" no mesmo quadro do commit do campo, com a URL sem busca, deixa o texto no campo. Chips e dicas do EmptyState (#25); sheet mobile (#26); E2E dos filtros (#27).

### #92 · Dica do estado vazio por busca e filtro · [PR #93](https://github.com/adamsalves/customer-directory/pull/93)

- **Decidido:** [#92](https://github.com/adamsalves/customer-directory/issues/92), sem ADR. Saiu da #25 (~540 linhas estimadas) para os chips caberem no teto, e entra antes da release do M5 para que a dica errada não fique na `main`: `?search=nunes&states=bahia&gender=female` mandava conferir a grafia de "nunes", que estava certa. Filtro é estado ou gênero; a busca não conta, e por isso o `hasFilter` do `FilterPanel`, que inclui a busca, não foi reaproveitado.
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/92#issuecomment-6477106910) · estimativa ~110 linhas
- **Como:** o `EmptyState` ganha a prop `filtered`, calculada na página, e escolhe a dica do protótipo (com "cliente" no lugar de "membro", ADR-0020): busca e filtro, só busca, só filtro. O botão "Limpar busca e filtros" não muda.
- **Resultado:** +48 −13 sem este registro (antes do review, +62 −14). A regressão no `index.spec` (3 URLs: estado e gênero, só estado, só gênero) falha na `main`. Mutação: 22 de 22 antes do review. O implementer acrescentou as duas URLs isoladas porque, só com a URL de estado e gênero, trocar `||` por `&&` sobrevivia. Review (`/code-review`, 7 achados, 2 aplicados):
  1. A 4ª dica, "Ainda não há clientes cadastrados.", nunca aparecia: com a fonte vazia, o `parseRawCustomers` lança erro e a tela mostra o erro. Eu a tinha posto no plano achando que corrigia o "ninguém chamado “”", e o registro da #21 já a dava como inalcançável. Agora, sem busca, a dica é sempre a de filtro.
  2. O `trim()` no componente repetia o do `parseListQuery`, que é quem entrega a busca. Saiu, com as 3 linhas de teste de brancos.

  Recusados 4:
  - Com busca e filtro, a dica manda remover filtros mesmo quando a busca sozinha já zera a lista. O texto também diz "Tente outro nome", o protótipo faz igual, e separar os casos pediria ao BFF um total só da busca.
  - Um acento solto como busca conta como busca aqui e o BFF o ignora. A entrada é artificial e o texto continua inofensivo.
  - Passar a `query` inteira ao `EmptyState`: o componente continua só recebendo props.
  - Extrair um `hasFilters(query)` para `shared/`: hoje são 2 cópias (painel e página), e os chips da #25 trazem a 3ª. Fica um `ponytail:` no `index.vue`, e a extração entra na #25.

- **Pendente:** `hasFilters(query)` compartilhado com os chips (#25).

### #25 · Chips removíveis dos filtros ativos · [PR #94](https://github.com/adamsalves/customer-directory/pull/94)

- **Decidido:** [#25](https://github.com/adamsalves/customer-directory/issues/25) · ADR-0013 (3 linhas novas: foco ao remover um chip, alvo de 44px abaixo de 960px, busca longa numa linha com reticências), ADR-0023. As dicas do EmptyState saíram para a #92 para os chips caberem no teto. O dono decidiu que o foco vai para o chip seguinte, senão para o anterior, senão para os resultados, e que os chips desenham a partir do estado em voo (`pending() ?? query.value`). No lugar da quebra de linha do protótipo, a busca longa termina em reticências. O dono aprovou passar do teto de ~400 linhas e manter os E2E de estilo.
- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/25#issuecomment-6477107348) e [adendo do `hasFilters`](https://github.com/adamsalves/customer-directory/issues/25#issuecomment-6477729855) · estimativa ~430 linhas
- **Como:** o `FilterChips` é uma `<ul aria-label="Filtros ativos">` acima dos resultados, fora deles e do painel, com um botão por busca, estado (na ordem da tabela) e gênero. Gênero "Todos" não gera chip. Cada chip calcula no clique o que tira do estado em voo, para que duas remoções seguidas se somem, e volta sozinho se a navegação for cancelada. A remoção grava com `page: 1`. O `hasFilters(query)` foi para `shared/utils/listQuery.ts` (estado ou gênero, sem a busca) e o usam a dica do estado vazio e o `FilterPanel`. O `GENDERS` foi para `app/utils/genders.ts`. O visual repete as medidas e os tokens do protótipo, com hover só com mouse.
- **Resultado:** +791 −19 sem este registro (estimativa ~430; antes do review, +707 −14). Specs +583, 127 delas de E2E, com uma asserção por declaração CSS. Mutação: `hasFilters` 11 de 11. No componente, 35 de 36: o vivo é mover o foco antes ou depois do `setQuery`, que dá o mesmo resultado. Colocação na página 5 de 5, CSS todo morto, e 4 de 4 nas correções do review. Review (`/code-review`, 10 achados, 7 aplicados):
  1. Um duplo clique removia dois chips: o chip some no clique, o seguinte desliza para baixo do ponteiro e recebe o segundo clique. Agora o clique com `event.detail > 1` é ignorado.
  2. Abaixo de 960px o chip de 44px tinha raio de 16px e deixava de ser pílula. Agora o raio é 22px, e o E2E de altura confere o raio em cada largura.
  3. Durante uma remoção em voo, as caixas e o "Limpar filtros" do painel seguiam a URL, e os chips seguiam o estado em voo. Desmarcar a caixa nesse intervalo devolvia o filtro. O painel passou a ler a mesma fonte dos chips.
  4. O chip da busca gravava com `push`, e o campo e os botões de limpar gravam com `replace` (ADR-0013). Agora usa `replace`, e Voltar pula a busca.
  5. O foco se movia mesmo quando o chip não estava focado (clique de mouse no Safari). Agora só se move se o chip tiver o foco.
  6. Os specs selecionavam por tag (`svg`, `span`, `li`). Agora usam `data-testid`.
  7. O filtro de `GENDERS` com dupla condição virou um ternário.

  Recusados 2:
  - Uma leitura única do estado em voo no `useListQuery`, já que o `pending() ?? query` aparece em 5 lugares. A refatoração passa por 4 componentes e o PR já estava acima do teto. O painel ganhou um `computed` local.
  - Este registro, que já estava previsto.

  Conferido no preview, nos dois temas a 375, 768 e 1280px: o roteiro de 4 passos, a busca longa, o Voltar depois de remover a busca e o duplo clique.

- **Pendente:** clicar no chip da busca no mesmo quadro em que o próprio campo grava cancela essa gravação, e o campo fica com o texto. Não é alcançável à mão, e a correção é no `SearchField`. Leitura única do estado em voo no `useListQuery` ([#95](https://github.com/adamsalves/customer-directory/issues/95)). Sheet mobile (#26); E2E dos filtros (#27). Leitor de tela e Safari não conferidos.

### #26 · Sheet de filtros no mobile · [PR #98](https://github.com/adamsalves/customer-directory/pull/98)

- **Decidido:** [#26](https://github.com/adamsalves/customer-directory/issues/26) · ADR-0013 (9 linhas novas), ADR-0014, ADR-0015 (o keyframe é `jsm-up`, e o `::backdrop` entra no movimento reduzido), ADR-0022 (a soma da barra no `scroll-padding` foi cumprida). O visual de pills e segmentado saiu para a [#96](https://github.com/adamsalves/customer-directory/issues/96), para o comportamento ficar num PR só. O dono decidiu:
  - o sheet continua aberto quando a tela passa de 960px: a largura é só CSS, e ao fechar o foco cai no `body`;
  - durante o carregamento, "Ver N clientes" mostra o último total;
  - o "Limpar" do rodapé limpa estados e gênero e mantém a busca, como no protótipo.

  O dono aprovou passar do teto de ~400 linhas e manter os E2E de estilo.

- **Plano:** [comentário na issue](https://github.com/adamsalves/customer-directory/issues/26#issuecomment-6496067522) · estimativa ~520 linhas
- **Como:** o `FilterSheet` fica na coluna da lista, antes dos chips.
  - **Barra fixa:** só abaixo de 960px, encostada no header (`--header-size`). O `--toolbar-size` de 61px entra no `scroll-padding-block-start`, que fica em 130px a 375, 158px a 768 e 97px a partir de 960.
  - **Botão "Filtros":** um badge com estados + gênero, sem a busca, lidos do estado em voo como nos chips. O `aria-label` é "Filtros, 1 ativo" ou "Filtros, N ativos".
  - **Dialog:** `<dialog>` com `showModal()` e o `FilterPanel` na variante `sheet`, montado só com o sheet aberto. A variante lista os 27 estados, sem "Ver todos" e sem o "Limpar filtros" interno, que levaria o foco a um fundo inerte.
  - **Rodapé:** o "Limpar" usa `aria-disabled` sem filtros, para o foco não cair no `body`. O botão de ação diz "Nenhum resultado", "Ver 1 cliente" ou "Ver N clientes" e só fecha o sheet.
  - **Rolagem:** `html:has(dialog:modal)` trava a página com `overflow: hidden` e `scrollbar-gutter: stable`.
  - **Animação:** `jsm-up` no sheet e `jsm-fade` no fundo, as duas desligadas pelo movimento reduzido.
- **Resultado:** +1697 −33 sem este registro (estimativa ~520; antes do review, +1410 −34). Código +451, specs +1234, docs +12.
  - **Por que estourou:** o SCSS do sheet deu 207 linhas (eu tinha estimado ~90), e o E2E fixa o estilo declaração por declaração.
  - **Mutação:** 77 de 77 no componente; 126 de 126 declarações de CSS; 26 de 26 nas correções do review. Três declarações equivalentes saíram do código. O `env(safe-area-inset-bottom)` não aparece no Chromium. O `88dvh` só se distingue do `vh` com a barra do navegador de um celular, e por isso o teste lê o texto da declaração.
  - **Review** (`/code-review`, 10 achados, 5 aplicados):
    1. Um arraste que começava dentro do sheet e terminava no fundo fechava o sheet, porque o clique vai para o ancestral comum, o dialog. Agora o fundo só fecha se a pressão e a soltura caem nele. O caso inverso, que o implementer achou depois, entrou na mesma regra.
    2. No duplo clique em "Filtros", o 2º clique caía no sheet recém-aberto: fechava pelo fundo ou marcava um estado. Agora um clique com `event.detail > 1` dentro do sheet é ignorado em captura. É a mesma lição dos chips.
    3. Travar a página com `overflow: hidden` tira a barra de rolagem clássica, e a página pulava 15px de lado. O `scrollbar-gutter: stable` entrou na própria regra da trava, que agora mira `dialog:modal`.
       - Primeiro eu o pus no `html` inteiro. O Chromium headless reservou 15px, quebrou 15 E2E de geometria, e uma página curta ganharia uma faixa vazia. Voltou para a trava.
    4. O `88vh` podia passar da área visível com a barra do navegador aberta. Agora é `88dvh`.
    5. A classe `.Sheet` vazia, criada para a #96, saiu com os testes dela. A #96 cria a classe quando houver estilo.

  - **Recusados 5:**
    - o anúncio do novo total ao leitor de tela, que virou a [#97](https://github.com/adamsalves/customer-directory/issues/97) (M9);
    - o tamanho do PR (exceção aprovada);
    - este registro, que já estava previsto;
    - derivar a altura do header e a sangria da barra de uma fonte só (dois casos, e o E2E fixa os valores);
    - reaproveitar o `hasFilters` e o plural do painel (o badge precisa do número, e o plural tem dois usos).

- **Pendente:** visual de pills e segmentado (#96); anúncio do total (#97); E2E dos filtros (#27). Não conferidos:
  - Safari e iPhone (`dvh`, área segura, foco depois do toque);
  - leitor de tela.

  Com barra clássica, numa página sem rolagem, travar a página ainda estreita o layout em 15px.
