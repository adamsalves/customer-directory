# Aprendizados

## ✅ O que funcionou bem

- **Planejar sem código.** Uma conversa inteira só de plano, com as decisões viradas em ADR antes do primeiro commit. Quando uma dúvida voltava ("buscar direto no S3?"), a resposta já estava escrita com o motivo.
- **Pedir que a IA revise, não só que produza.** A revisão do protótipo achou um bug real (`--overlay` apontando para si mesma) e dois contrastes abaixo do WCAG AA que eu não teria visto a olho.
- **PRs pequenos com review independente.** No M1, a maioria dos PRs teve achados reais no review feito por um sub-agente sem o contexto da implementação. Exemplos:
  - a regra do ESLint contra `$fetch<T>` não pegava `$fetch.raw<T>`, e as regras do TypeScript não rodam no `<template>` do Vue, onde `as` e `!` passavam;
  - o Stylelint não lia `<style>` dentro de `.vue`;
  - o pre-commit só tinha sido testado com `.ts`, e `.css`, `.yaml`, `.cjs` e `.mts` passavam no commit e quebravam no CI;
  - o Playwright reaproveitava um build velho já servido na porta e dava verde com a página quebrada.
- **Provar a ferramenta quebrando de propósito.** Uma regra de lint ou um teste só conta depois de falhar com o erro que deveria pegar. Foi assim que o cache de módulos do Vitest 5 apareceu: a primeira execução passava por sorte.
- **Medir antes de planejar.** No E2E do tema (#11), a medição mostrou que o CSS não tem media query de `prefers-color-scheme`: sem cookie, antes da primeira pintura, só o script inline do `<head>` aplica o escuro. Isso definiu o teste (sistema escuro emulado e JS ligado) antes de escrever uma linha.
- **O review seguiu achando bugs reais no M2.** Exemplos:
  - um cookie malformado (`jsm-theme=dark%`) derrubava todas as páginas com 500, porque o `useCookie` decodifica sem try/catch;
  - keyframes globais usados num CSS Module viravam um nome com hash e a animação sumia sem erro;
  - o breadcrumb anunciava duas "páginas atuais", e o teste de componente não via porque troca o link por um stub;
  - o header fixo cobria o conteúdo logo depois do skip link.
- **No M3, o review pegou bugs que nenhum teste via.** Exemplos:
  - uma fonte vazia gravava a lista vazia no cache por 1h (#12 e #14);
  - os testes de idade só pegavam `getUTC*` trocado por getter local fora de UTC, e o CI roda em UTC (#13);
  - o 502 fazia o ofetch repetir o GET sozinho, dobrando as leituras do S3 e o tempo até o erro (#17);
  - trocar os itens por página pelo teclado tirava o select focado da tela (#71), e a correção desfazia a rolagem do leitor durante a carga (#72).
- **Dividir quando a issue cresce.** A paginação (#16) passou do teto; rolagem e foco viraram a #71 e a #72, cada uma com review próprio.

## ❌ O que não funcionou

- **Confiar no primeiro verde.** No M1, vários setups pareciam completos porque o caminho feliz passava: o Vitest, o E2E e o cache do GitHub Actions, cujo ramo de cache-hit nunca roda na primeira execução de um PR.
- **Dependências que entram por tabela.** O commitlint trouxe `@types/node` 26 como peer, e o typecheck aceitava APIs que não existem no Node 24 do runtime. O `typescript` 7 quebra o `vue-tsc` sem aviso de peer. Ambos só apareceram lendo o lockfile.
- **Corpo do PR escrito de memória.** Versões e contagem de linhas no texto do PR divergiram do diff. O review pegou, e passei a recontar a cada commit.
- **IA sem contexto procura no lugar errado.** Logo no início, a pergunta sobre o comportamento da busca foi respondida procurando código num repositório vazio, em vez de ler o plano.
- **Teste que não afirma o que diz.** O spec dos tokens conferia só os nomes: uma cor errada ou os temas trocados passavam. No dark mode, tirar a validade do cookie passou na suíte inteira, porque "recarregar mantém o tema" também passa com cookie de sessão.
- **Pular a aprovação do plano.** Na #11, o plano foi direto ao sub-agente de implementação, sem o meu ok. Apontei o desvio e a aprovação passou a ser etapa explícita antes de chamar o `implementer`.
- **Critério herdado do protótipo sem conferir o padrão.** A issue do toggle pedia `aria-pressed` junto com um rótulo que alterna. Pelo padrão APG, isso fazia o leitor de tela anunciar o tema errado. Só apareceu no review, depois de implementado.
- **Estimar sem contar os specs.** No M3, a #16 fechou com +659 (estimada bem abaixo), a #71 com +336 contra +264 e a #72 com 449 depois do review. Os specs são perto de 40% do diff.
- **Confiar no teste de componente para CSS e hidratação.** O happy-dom não aplica media query e o `mountSuspended` não hidrata. Layout por largura e erro vindo do SSR só ganharam teste no E2E da #18, com critérios acrescentados depois, a cada review que notava a falta.
- **Pior caso tirado da fixture.** A "lista mais larga" da paginação veio dos dados de teste; o pior caso de verdade (`1 2 3 4 5`, 308px) só apareceu no review.
- **Verde por sorte, de novo.** No E2E da #18, as repetições do `--repeat-each` rodaram em paralelo, colidiram na porta e passaram mesmo assim. Só a saída de erro mostrou.

## 🔄 O que eu faria diferente

- Escrever a prova de cada configuração (o arquivo que deve falhar) junto com a issue, e não depois do review.
- Fixar desde o início as dependências que vêm por peer e conferir o lockfile a cada `npm install`.
- Colocar os labels da issue no PR desde o primeiro: as notas de release são agrupadas pelos labels do PR.
- Conferir os atributos ARIA de cada critério com o padrão APG já no plano da issue.
- Provar link ativo, hidratação e cookie em E2E ou no HTML do servidor desde o início, e não em teste de componente.
- Contar os specs na estimativa e dividir a issue já no plano quando passar de ~350 linhas.
- Colocar na issue, desde o início, o critério de E2E de tudo que só o CSS ou a hidratação decidem.
- Tirar o pior caso de todos os ramos do algoritmo, e não da fixture.
