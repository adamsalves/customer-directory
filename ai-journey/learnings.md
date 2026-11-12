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
- **No M4, o review seguiu achando o que a suíte deixava passar.** Exemplos:
  - uma tecla digitada enquanto a gravação anterior ainda navegava sumia do campo (#20);
  - `?search=ana%20` e `?search=ana` eram dois estados, com entrada nova no histórico (#19);
  - a busca do E2E dava o mesmo card casando todas as palavras, qualquer uma ou só a primeira (#22).
- **No M5, o review achou o que nenhum teste unitário via.** Exemplos:
  - uma escolha cancelada no caminho deixava a caixa marcada, porque o Vue não reescreve `checked` (#24);
  - escritas em voo de componentes diferentes se cancelavam, e virou uma issue própria antes dos chips (#90);
  - um duplo clique removia dois chips, e o mesmo defeito apareceu no gatilho do sheet (#25, #26).
- **No M6, o review achou o que só aparecia fora da fixture ou no toque.** Exemplos:
  - o nome inteiro, montado por fora das partes, divergia do sobrenome com o primeiro nome vazio, caso que a fixture não tem (#28);
  - a troca de página escondia a contagem nova sob a barra sticky (#103);
  - tocar no chevron da pílula de ordenação não abria a lista, porque o toque caía no rótulo (#29).
- **Refutar com prova antes de corrigir.** Um achado dizia que a escolha feita antes da hidratação ficava na tela. Um E2E que segurava os scripts mostrou que o Vue reescreve o `:selected`, e a correção não entrou (#29).
- **Conferir no preview.** O Alto Contraste das pílulas passava nos testes com valores computados certos, e só o preview mostrou o rótulo sumindo (#96).
- **Dividir quando a issue cresce.** A paginação (#16) passou do teto; rolagem e foco viraram a #71 e a #72, cada uma com review próprio.
- **Decodificar o protótipo em vez de "conferir a olho".** No #137 o bundle decodificado entregou os valores 1:1 (72%, −16px, tabular-nums, grid-areas) e revelou o `:active` que pinta o rótulo — diferença invisível na tela.
- **Provar a asserção no Chrome antes de pinar.** A volta do `scrollLeft` a zero depois de rolar até o fim, que o plano da #137 contava, não se mostrou: nenhuma receita de rolagem re-snapou neste Chromium. Medir salvou o teste de pinar o que nunca aconteceria — o snap ficou assegurado no computed, e a rolagem, pendente.
- **Cortar pela régua do desafio.** O corte do M9 passou cada issue pelos 7 critérios de avaliação: 12 issues viraram 6 em duas releases, e o que sobrou saiu com nota para reabrir após a entrega.
- **Medir performance na produção.** Na #42 o Lighthouse local deu 88–92 (o Nitro local serve os assets sem gzip) e o painel do DevTools com extensões deu 72; na produção, o CLI deu 99–100 e 95–98 e o PSI confirmou 100/99. O README registra a metodologia.
- **Round-trip no artefato re-encodado.** O protótipo editado só se provou decodificando de novo: os dois bundles voltaram byte a byte, e o asset embutido no responsivo descomprimiu no desktop novo (#43).
- **E2E lê o que o servidor responde, byte a byte.** O favicon do Nitro é um GIF embutido que responde 200 e `image/x-icon` quando o arquivo não existe: status e content-type não bastam, o teste compara os bytes (#43).

## ❌ O que não funcionou

- **Confiar no primeiro verde.** No M1, vários setups pareciam completos porque o caminho feliz passava: o Vitest, o E2E e o cache do GitHub Actions, cujo ramo de cache-hit nunca roda na primeira execução de um PR.
- **Dependências que entram por tabela.** O commitlint trouxe `@types/node` 26 como peer, e o typecheck aceitava APIs que não existem no Node 24 do runtime. O `typescript` 7 quebra o `vue-tsc` sem aviso de peer. Ambos só apareceram lendo o lockfile.
- **Corpo do PR escrito de memória.** Versões e contagem de linhas no texto do PR divergiram do diff. O review pegou, e passei a recontar a cada commit.
- **IA sem contexto procura no lugar errado.** Logo no início, a pergunta sobre o comportamento da busca foi respondida procurando código num repositório vazio, em vez de ler o plano.
- **Teste que não afirma o que diz.** O spec dos tokens conferia só os nomes: uma cor errada ou os temas trocados passavam. No dark mode, tirar a validade do cookie passou na suíte inteira, porque "recarregar mantém o tema" também passa com cookie de sessão.
- **Pular a aprovação do plano.** Na #11, o plano foi direto ao sub-agente de implementação, sem o meu ok. Apontei o desvio e a aprovação passou a ser etapa explícita antes de chamar o `implementer`.
- **Critério herdado do protótipo sem conferir o padrão.** A issue do toggle pedia `aria-pressed` junto com um rótulo que alterna. Pelo padrão APG, isso fazia o leitor de tela anunciar o tema errado. Só apareceu no review, depois de implementado.
- **Estimar sem contar os specs.** No M3, a #16 fechou com +659 (estimada bem abaixo), a #71 com +336 contra +264 e a #72 com 449 depois do review. Os specs são perto de 40% do diff. No M4, a #20 fechou com +1060 contra 340.
- **Confiar no teste de componente para CSS e hidratação.** O happy-dom não aplica media query e o `mountSuspended` não hidrata. Layout por largura e erro vindo do SSR só ganharam teste no E2E da #18, com critérios acrescentados depois, a cada review que notava a falta.
- **Pior caso tirado da fixture.** A "lista mais larga" da paginação veio dos dados de teste; o pior caso de verdade (`1 2 3 4 5`, 308px) só apareceu no review.
- **Verde por sorte, de novo.** No E2E da #18, as repetições do `--repeat-each` rodaram em paralelo, colidiram na porta e passaram mesmo assim. Só a saída de erro mostrou.
- **Apagar código porque a mutação sobreviveu.** Na #19, o `return` da busca em branco saiu porque não mudava a saída. Era o atalho da chamada mais comum, e sem ele a listagem dobrava os 200 nomes a cada pedido. O segundo review o trouxe de volta.
- **Mutação que só pergunta "algum teste falha?".** No E2E dos filtros (#27), o chip que remove o primeiro estado passava porque todo teste clicava o primeiro, e o review achou duas asserções que nunca falhavam: uma conferia 9 cards, que são 9 antes e depois da busca.
- **Recusar um achado sem rodar o mutante.** No E2E da ordenação (#30), recusei ler o HTML do servidor no reload achando que o `useFetch` reaproveita o payload do SSR. A mutação mostrou que um SSR que ignora o `sort` muda a chave, o cliente refaz a busca e corrige a lista, e nenhuma linha via.
- **Estimar sem contar os specs, de novo.** No M5, a #23 fechou com +624 contra ~290, a #24 com +1242 contra ~560 e a #26 com +1697 contra ~520.
- **Estimar sem contar os specs, ainda.** No M6, a #103 fechou com +425 contra ~200 e a #29 com +884 contra ~300, quase tudo E2E de estilo. O E2E da ordenação (#30) ficou perto: +115 contra ~100, depois do review.
- **Estimar sem contar os specs, de novo.** No M7, a #32 fechou com +747 contra ~330 e a #35 com +763 contra ~330, as duas aprovadas como exceção; os E2E de estilo ficaram no alvo: #125 com +225 contra ~230 e #129 com +206 contra ~200.
- **Pressupor que a fixture dá o conteúdo.** Nenhum estado tem ≥3 clientes: o related nunca passa de 1 card, a rolagem verdadeira não existe com os 20 registros e nem a coluna alargada levou ao snap — o Chromium do teste não voltou ao repouso do snap depois de nenhuma rolagem.
- **Confiar na medição local de performance.** O Lighthouse local distorceu (assets sem gzip: 88–92 contra 95–98 da produção), e o painel do DevTools com extensões deu 72 no mesmo instante de um PSI 100/99 — instrumento e ambiente fazem a nota (#42).
- **Prompt longo demais ao implementer no opencode.** Voltava vazio; o probe curto funcionava. A missão passou a ir em etapas.
- **Runner fora do controle.** O DNS do CI caiu por ~2h40 e matou o `playwright install --with-deps` em 6 corridas seguidas com a `main` verde; o merge foi ordenado com a exceção documentada no review (#43).

## 🔄 O que eu faria diferente

- Escrever a prova de cada configuração (o arquivo que deve falhar) junto com a issue, e não depois do review.
- Fixar desde o início as dependências que vêm por peer e conferir o lockfile a cada `npm install`.
- Colocar os labels da issue no PR desde o primeiro: as notas de release são agrupadas pelos labels do PR.
- Conferir os atributos ARIA de cada critério com o padrão APG já no plano da issue.
- Provar link ativo, hidratação e cookie em E2E ou no HTML do servidor desde o início, e não em teste de componente.
- Contar os specs na estimativa e dividir a issue já no plano quando passar de ~350 linhas.
- Colocar na issue, desde o início, o critério de E2E de tudo que só o CSS ou a hidratação decidem.
- Tirar o pior caso de todos os ramos do algoritmo, e não da fixture.
- Antes de apagar um `return` antecipado que a mutação não pega, medir o custo do caminho mais comum.
- Escolher dados de teste que separem as variantes do algoritmo (todas as palavras, qualquer uma, só a primeira), e não só os que dão o resultado esperado.
- Pedir, para cada asserção de E2E, o mutante que derruba aquela linha, e clicar um item que não seja o primeiro da lista.
- Medir no plano quantas linhas o E2E de estilo vai custar quando a issue fixa CSS declaração por declaração.
- Medir os valores serializados computados no Chrome antes de pinar (`grid-template-areas`, `grid-auto-columns: 72%`), e não escrever a asserção do cálculo mental.
- Registrar a divergência do protótipo já na conferência do measurer — o `:active` do rótulo apareceu na decodificação do #137, e virou linha da ADR-0013 no próprio PR, não numa issue depois.
- Medir performance direto na produção desde a primeira rodada; o local só serve de sanidade.
- No opencode, dividir a missão do implementer em etapas já na primeira chamada.
