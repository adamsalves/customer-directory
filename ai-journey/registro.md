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
