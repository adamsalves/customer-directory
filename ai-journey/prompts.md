# Prompts

Só os prompts que mudaram o rumo do projeto. Os trechos entre aspas são o que escrevi de fato.

## Fase 0 · Planejamento

### 🔧 Prompt: Como atacar o desafio

**Ferramenta:** Claude Code (modo de plano)

**O que perguntei:**
"Leia esse repositório e vamos conjecturar o modo como vamos atacar esse desafio"

**O que aconteceu:**
A IA leu o README do desafio e o JSON da API antes de propor a stack. Três achados nos dados mudaram o desenho:

- não existe campo `id`, mas o email é único nos 200 registros, então o slug do email vira a URL do detalhe (ADR-0006);
- nomes, cidades e estados vêm em minúsculas e precisam ser formatados no servidor;
- as coordenadas caem fora do Brasil, então o mapa ficou de fora (ADR-0008).

**Abordagem final:**
Nuxt 4 com SSR, Nitro como BFF fazendo busca, filtro e paginação em funções puras, e o estado da lista na URL (ADR-0002, 0004 e 0007).

### 🔧 Prompt: Cache no BFF ou S3 a cada busca

**Ferramenta:** Claude Code

**O que perguntei:**
Com o plano já escrito, quis entender de onde a busca tiraria os dados: "Só para confirmar, todas as operações feitas com a api são feitas em tempo real né? consultando a api mesmo. Exemplo nas buscas e filtros!" e, depois da resposta, "Qual é o modo mais sensato para esse caso, deixar como planejado ou fazer a busca direto no s3 toda vez?"

**O que aconteceu:**
A primeira resposta procurou código no repositório, que ainda estava vazio, e não achou nada. Precisei apontar o plano. Depois veio a explicação: o navegador consulta o nosso servidor a cada mudança, e o servidor guarda o JSON do S3 em cache por 1h. O S3 é um arquivo estático que não aceita filtro, então ir até ele a cada tecla só baixaria os mesmos ~177KB de novo, deixaria a resposta mais lenta e exporia o usuário a falhas do S3.

**Abordagem final:**
Cache de 1h com stale-while-revalidate no BFF (ADR-0005). Quando o cache vence, o usuário recebe a cópia anterior e a atualização acontece em segundo plano.

### 🔧 Prompt: Revisar o protótipo

**Ferramenta:** Claude Code + Claude Design

**O que perguntei:**
"Registre no plano esse design que foi feito! Analise-o e se precisar adeque o plano. Se precisar, me diga que eu ajusto o protótipo" e, em seguida, "Me passe um prompt (ou quantos precisar) para eu ajustar o layout"

**O que aconteceu:**
A IA leu o protótipo e trouxe para o plano o que ele acrescentava (filtro por gênero, chips, itens por página, bottom sheet, anterior/próximo no detalhe). Faltava o dark mode, então ela escreveu dois prompts para eu levar ao Claude Design: um com a paleta escura já conferida para contraste AA, outro com ajustes de contraste no tema claro. Na v2, recalculou o contraste de todos os tokens e achou três problemas:

- **bug:** `--overlay: var(--overlay)` aponta para si mesma, e o fundo escurecido do sheet some no tema claro;
- a borda do input dá 2,99:1 sobre o header (o mínimo é 3);
- o "/" do atalho de teclado dá 4,34:1 (o mínimo é 4,5).

**Abordagem final:**
O protótipo v2 é a fonte da verdade de UI (ADR-0013). Os três problemas são corrigidos nos tokens do código, e os desvios do protótipo ficam registrados com o motivo: slug em vez de posição na lista (ADR-0006), responsividade só com CSS (ADR-0014) e `<dialog>` nativo (ADR-0015).

### 🔧 Prompt: Idioma e tipagem honesta

**Ferramenta:** Claude Code

**O que perguntei:**
"Dentro do projeto, no código, o padrão deve ser escrita em inglês (variaveis, funcoes e tal), os elementos do layout, como labels e afins podem ficar em português mesmo. No código typescript, não sei se já está no plano, a tipagem deve ser honesta, sem cast, any e afins que contornem a typegem!"

**O que aconteceu:**
A IA tratou a URL pública como interface (`/membros?busca=`) e concentrou a tradução para o objeto em inglês num único lugar, o `parseListQuery`. Para a tipagem, listou também os casts disfarçados (`$fetch<T>`, `useFetch<T>`, `JSON.parse() as T`) e propôs garantir as regras pelo ESLint com informação de tipos, não só por convenção. Dados externos entram como `unknown` e passam por type guards, sem adicionar zod.

**Abordagem final:**
ADR-0016 (tipagem honesta) e ADR-0017 (código em inglês, interface em pt-BR), as duas no `AGENTS.md`.

### 🔧 Prompt: Critérios de avaliação

**Ferramenta:** Claude Code

**O que perguntei:**
"Além de criar o CLAUDE.md, crie o AGENTS.md também. e revise os critérios de avaliação que constam no repo"

**O que aconteceu:**
A revisão cruzou o plano com as 7 competências do README oficial e achou lacunas: estratégia de estado não explícita, falta de testes de integração da API, nada sobre tamanho de bundle, fallback de avatar e a seção "Melhorias sobre o layout original".

**Abordagem final:**
As lacunas viraram itens do backlog e a ADR-0007 (estado). O `AGENTS.md` concentra as regras e o `CLAUDE.md` só o importa.

### 🔧 Prompt: Milestones e PRs

**Ferramenta:** Claude Code

**O que perguntei:**
Depois de ver o primeiro corte dos milestones, que era por camada: "Pensar nos milestones como pontos atômicos, que fechem uma feature ou algo do tipo. Para o código ficar rastreável e PRs com um limite ok" e "Acha nencessário criar estruturas de deploy e release?"

**O que aconteceu:**
Os milestones estavam cortados por camada (BFF, depois layout, depois lista), e o PR da lista teria oito ou mais componentes juntos. A IA os recortou em fatias verticais, cada uma terminando com o E2E da feature. Sobre deploy e release, ela recomendou não criar estrutura própria: a integração Git da Vercel já dá preview por PR, e uma tag com GitHub Release por milestone basta. semantic-release, changesets e `CHANGELOG.md` ficaram de fora.

**Abordagem final:**
9 milestones (M1 Fundação a M9 Auditoria e entrega), uma issue por PR com ~400 linhas no máximo, GitHub Flow com squash, e uma release ao fechar cada milestone: `v0.1.0` a `v0.8.0` de M1 a M8, e `v1.0.0` na entrega (ADR-0012).

## M2 · Shell + tema

### 🔧 Prompt: Medir antes de planejar

**Ferramenta:** Claude Code + sub-agentes

**O que perguntei:**
"A partir de agora, M2, vamos usar o seguinte fluxo. Measurer antes do planejamento com o agente principal, para coletar evidências antes do planejamento, depois implementer para codificar a issue."

**O que aconteceu:**
Os sub-agentes já existiam como presets globais do Claude Code, que servem para qualquer repositório. Cada um tem modelo e esforço próprios para uma atividade:

- `measurer`: localiza e mede no código e devolve números com evidência, sem despejar arquivos;
- `implementer`: codifica um plano já fechado, sem decidir escopo;
- `reviewer`: faz o review independente de cada PR.

O planejamento ficou de propósito no agente principal, porque é ele que tem a conversa. Um sub-agente de plano começaria sem o contexto. O plano passa pela minha aprovação antes de ir para o `implementer`. Na própria #11 essa etapa foi pulada, e eu reforcei o fluxo.

**Abordagem final:**
Ninguém escreve o prompt do agente do zero. Ele é montado em três camadas:

- **o quê:** os critérios de aceite da issue;
- **regras:** as ADRs citadas no topo da issue e o `AGENTS.md`;
- **fatos e como:** o relatório do `measurer` e o plano feito a partir dele, depois de aprovado por mim.

Na [#11](https://github.com/adamsalves/customer-directory/issues/11), os critérios viraram os quatro testes do E2E do tema, e o ADR-0011 trouxe o tema forçado pelo cookie. A medição mostrou que o CSS não tem media query de `prefers-color-scheme`: sem cookie, antes da primeira pintura, só o script inline aplica o escuro. Daí vieram o sistema escuro emulado em todos os testes e o rótulo do toggle como sinal de que a página hidratou. O plano listou também os defeitos plantados que provam cada teste.

## M3 · Listagem paginada

### 🔧 Prompt: Fonte fora do ar sem perder a lista

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
Um endpoint `/api/customers` paginado, que lê o S3 com cache de 1h e SWR ([#14](https://github.com/adamsalves/customer-directory/issues/14)), e uma tela de erro com "Tentar novamente" para quando o S3 falhar ([#17](https://github.com/adamsalves/customer-directory/issues/17)).

**O que aconteceu:**
O caminho feliz funcionou logo. Os reviews acharam os problemas na falha:

- com todos os registros inválidos, o parser devolvia `[]`, e a lista vazia ia para o cache por 1h;
- uma fonte vazia ainda apagava o cache, e o `event.waitUntil`, que o próprio PR tinha posto como conserto, não protegia nada no Nitro 2.13;
- o 502 fazia o ofetch repetir o GET sozinho, o que dobrava as leituras do S3 e o tempo até o erro aparecer.

**Abordagem final:**
O parser lança erro quando não sobra nenhum registro válido, e o cache guarda a cópia antiga. O 502 sai do handler, e não do `fetchCustomers`, para o SWR continuar servindo essa cópia enquanto ela existir. O `useFetch` roda com `retry: false`. A tela de erro tem texto fixo, avisa que os filtros serão mantidos e chama `refresh`. O retry leva o foco de volta aos resultados.

### 🔧 Prompt: Uma marcação, o CSS decide o layout

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O card do cliente, a lista e os skeletons ([#66](https://github.com/adamsalves/customer-directory/issues/66), [#15](https://github.com/adamsalves/customer-directory/issues/15), [#67](https://github.com/adamsalves/customer-directory/issues/67)) com uma marcação só para toda largura, como manda a ADR-0014: grade a partir de 640px e linha abaixo disso.

**O que aconteceu:**
O protótipo tem duas versões da linha de local (grade e linha). As duas ficaram no HTML, e o CSS esconde uma com `display: none`, que também a tira da árvore de acessibilidade. O hover sobe o card 2px só com `(hover: hover)`. A animação de entrada perdeu o `both`, porque o último quadro prendia `transform: none` e anulava o hover. Os skeletons são sempre 9, numa lista com `aria-busy`. Nenhum teste de componente via isso: o happy-dom não aplica media query, e os reviews da #66 e da #67 acrescentaram critérios ao E2E da #18.

**Abordagem final:**
O E2E da [#18](https://github.com/adamsalves/customer-directory/issues/18) mede o layout no navegador. Conta as colunas pelo `x` dos cards (1 em 639px, 2 em 640px, 3 em 768px), confere qual linha de local aparece em 375 e em 1280, testa o hover só no projeto desktop e mede o skeleton com `/api/customers` preso: 98px na linha e 310px na grade.

### 🔧 Prompt: Paginação por links

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
Paginação com reticências, versão compacta no mobile, alvos de 44px abaixo de 960px e o seletor "Itens por página" (9, 18, 27, 54), que volta para a página 1 ([#16](https://github.com/adamsalves/customer-directory/issues/16)).

**O que aconteceu:**
Cada página virou um link, e não um `<button>`, para ter endereço e abrir em outra aba. Com isso, o RouterLink, que ignora a query, marcava todos os links para `/customers` com `aria-current="page"`. Só o E2E mostrava, porque o teste de componente troca o link por um stub. O algoritmo veio do protótipo, menos uma parte: a reticência que esconde uma página só (`1 … 3 4 5 … 8`) virou o próprio número, porque custava um clique a mais. O review mostrou que o pior caso de largura não era `1 2 3 … 23`, tirado da fixture, e sim `1 2 3 4 5`, com 308px. O PR fechou com +659 −1, acima do teto, como exceção.

**Abordagem final:**
Cada link leva `aria-current-value="false"` e o `aria-current` fica fixo no span da página atual. A rolagem e o foco saíram para a [#71](https://github.com/adamsalves/customer-directory/issues/71) e a [#72](https://github.com/adamsalves/customer-directory/issues/72). A página rola até os resultados só quando muda com o mesmo tamanho, porque rolar ao trocar os itens por página tirava o select focado da tela. O foco vai para a seção dos resultados, e o select fica no lugar enquanto a lista cresce acima dele.

## M4 · Busca

### 🔧 Prompt: Busca sem acento no BFF

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
Busca por nome e/ou sobrenome no `/api/customers`, sem diferenciar acento nem caixa, com a chave `search` na URL ([#19](https://github.com/adamsalves/customer-directory/issues/19), ADR-0021).

**O que aconteceu:**
O filtro roda antes da paginação, então `total` e `totalPages` contam só o que casou. A dobra de acento saiu do `slugify` para um `foldText` que a busca e o slug usam. Na mutação, o `return` da busca em branco sobreviveu, porque `''` está em todo nome e a saída não mudava, e saiu do código. O segundo review trouxe esse `return` de volta: sem ele, a listagem sem busca, que é a chamada mais comum, dobrava os 200 nomes à toa. Os dois reviews também acharam:

- `?search=ana%20` e `?search=ana` eram dois estados, com busca repetida e entrada nova no histórico;
- voltar de `?page=2` para `?search=ana` rolava a tela e tirava o foco do campo, porque o `pageChanged` só comparava a página;
- cada palavra é comparada com cada nome sem cache, e a busca não tinha tamanho máximo.

**Abordagem final:**
O parser apara a busca e corta em 100 caracteres. O `foldText` usa NFKD, que também lê letras de largura cheia. O `sameListState` compara todo o estado menos a página, e o `useListQuery` e o `pageChanged` usam essa função. O `return` da busca em branco tem um teste que conta as chamadas a `normalize`.

### 🔧 Prompt: Um campo que grava na URL

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O campo de busca no header ([#20](https://github.com/adamsalves/customer-directory/issues/20)), com espera de 300ms, histórico com `replace` na lista, atalho `/` e o hint `kbd` a partir de 960px.

**O que aconteceu:**
O `refDebounced` do plano não serviu, porque o rascunho reescrito por voltar ou avançar viraria uma gravação. O timer ficou no componente, disparado pelo `@input`. Antes do PR, a conferência do implementer achou três problemas. Um espaço no fim, na página 2, voltava à página 1. Acima de 100 caracteres, a URL guardava o texto inteiro e o campo era cortado. E o CSS só tinha medida manual. O review achou mais:

- uma tecla digitada enquanto a gravação anterior ainda navegava sumia do campo;
- no tema escuro, a pílula clara do logo esticava junto com a coluna de 272px. Decidi que a pílula fica só no logo;
- o Esc ignorava `isComposing` (tecla morta, IME), e o `/` não valia com o foco num checkbox.

O PR fechou com +1060 contra a estimativa de 340. Quase tudo é teste, e o tamanho foi aceito como exceção.

**Abordagem final:**
O campo guarda a busca em voo (`pending`), cancela a espera quando a rota sai da lista e não navega com a busca vazia fora dela. O header virou um grid a partir de 960px, e o input ganhou `aria-keyshortcuts="/"`. Os E2E de layout travam o hint (959 e 1280px), a altura do input e a coluna do logo.

### 🔧 Prompt: Nenhum resultado e o caminho de volta

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O estado vazio com "Limpar busca e filtros" ([#21](https://github.com/adamsalves/customer-directory/issues/21)) e o E2E do fluxo de busca ([#22](https://github.com/adamsalves/customer-directory/issues/22)).

**O que aconteceu:**
O protótipo não move o foco depois de "Limpar", mas o botão some quando o skeleton entra, e o foco cairia no `body`. Ele passou a ir para os resultados (ADR-0013). A conferência do implementer achou um termo longo sem espaço, como um e-mail, estourando a dica a 320 e 375px, o mesmo defeito do protótipo. No E2E, o review da #22 mostrou que `girao rosa` não provava que todas as palavras precisam casar, porque nenhuma outra pessoa da fixture tem "girao" ou "rosa". Mostrou também que o teste do histórico podia perder a primeira letra, porque o foco vai aos resultados um frame depois da troca de página. E que o arquivo pulava o mobile, que a ADR-0009 pede.

**Abordagem final:**
O "Limpar" grava com `replace`, mantém o `perPage` e leva o foco aos resultados. A dica quebra dentro da palavra (`overflow-wrap: anywhere`). O E2E busca `girao jesus` para o estado vazio: cada palavra casa com alguém e as duas juntas com ninguém, então as mutações "qualquer palavra" e "só a primeira" no BFF derrubam o teste. O teste do histórico espera o foco nos resultados antes de digitar, e o fluxo roda nos dois projetos.

## M5 · Filtros

### 🔧 Prompt: Filtros e contagens no BFF

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
Filtro por estado e por gênero no `/api/customers`, com a contagem de cada opção na resposta e as chaves `states` e `gender` na URL ([#23](https://github.com/adamsalves/customer-directory/issues/23), ADR-0004, ADR-0021).

**O que aconteceu:**
A regra das contagens veio do protótipo: cada uma deixa de fora o filtro a que pertence, então os estados são contados sobre busca + gênero e o gênero sobre busca + estados. Os casos de teste foram escolhidos para que AND, OR e "só o primeiro filtro" deem totais diferentes, e a mutação matou os 57 mutantes. O PR fechou com +624 contra ~290 estimadas, quase tudo teste. O review achou três coisas:

- um link só com filtro (`?states=sao-paulo`) podia zerar a lista, e "Limpar busca e filtros" limpava só a busca;
- o cache do Nitro em disco, no dev, sobrevivia ao restart e servia por até 1h clientes sem o `stateSlug` novo, e o filtro de estado não achava ninguém;
- o `sameListState` comparava os estados em ordem, então a mesma escolha em outra ordem contava como estado diferente.

**Abordagem final:**
O parser mantém só os 27 slugs, sem repetição e na ordem da tabela, e o serializador aplica a mesma regra, porque todo link passa por ele. O "Limpar" zera também `states` e `gender`. O cache ganhou `integrity`, com um comentário para subir o valor quando o `ICustomer` mudar. O `sameListState` compara o que cada estado escreve na URL.

### 🔧 Prompt: Painel, chips e quem grava na URL

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O painel de filtros do desktop com checkboxes e rádios nativos ([#24](https://github.com/adamsalves/customer-directory/issues/24)), os chips removíveis dos filtros ativos ([#25](https://github.com/adamsalves/customer-directory/issues/25)) e a dica certa no estado vazio quando há filtro ([#92](https://github.com/adamsalves/customer-directory/issues/92)).

**O que aconteceu:**
O review do painel achou uma escolha cancelada no caminho (breadcrumb, Voltar) deixando a caixa marcada com a lista sem filtro. O Vue só reescreve `checked` quando o valor do vnode muda. O mesmo review mostrou que a busca, gravando a partir da URL velha, cancelava a escolha do painel. Isso virou a [#90](https://github.com/adamsalves/customer-directory/issues/90), feita antes dos chips para eles não nascerem com o mesmo defeito, e o review dela levou a oito correções, entre elas:

- uma busca (`replace`) sobre uma escolha (`push`) em voo apagava do histórico o estado anterior;
- digitar e clicar em "Limpar" antes dos 300ms fazia a busca antiga voltar;
- os links da paginação descartavam uma escolha em voo.

Nos chips, um duplo clique removia dois: o chip some, o seguinte desliza para baixo do ponteiro e recebe o segundo clique. No preview do painel apareceu "Não encontramos ninguém chamado “nunes”" com busca e filtro, quando havia Nunes, só não mulheres na Bahia.

**Abordagem final:**
O `useListQuery` guarda a gravação que a URL ainda não tem, uma por router (ADR-0023). O `setQuery` soma o que muda ao que está em voo, e painel, chips, "Limpar" e paginação partem desse estado. O painel volta os controles ao que a URL diz quando nada mais está em voo. O chip ignora o clique com `event.detail > 1`, e o foco vai para o chip seguinte, o anterior ou os resultados. O `EmptyState` escolhe a dica pela busca e pelos filtros, e o `hasFilters` foi para `shared/`.

### 🔧 Prompt: O sheet do mobile

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O bottom sheet de filtros abaixo de 960px com `<dialog>` nativo e "Ver N clientes" ([#26](https://github.com/adamsalves/customer-directory/issues/26)), o visual de pílulas e controle segmentado do protótipo ([#96](https://github.com/adamsalves/customer-directory/issues/96)) e o E2E dos filtros no desktop e no mobile ([#27](https://github.com/adamsalves/customer-directory/issues/27)).

**O que aconteceu:**
O visual saiu da #26 para o comportamento caber num PR, e mesmo assim ela fechou com +1697 contra ~520, porque o E2E fixa o estilo declaração por declaração. O review do sheet achou:

- um arraste que começava no sheet e terminava no fundo fechava o sheet, porque o clique vai para o ancestral comum, o dialog;
- no duplo clique em "Filtros", o segundo clique caía no sheet recém-aberto;
- travar a rolagem tirava a barra e a página pulava 15px de lado.

Nas pílulas, o segmento marcado sumia no Alto Contraste, e o indicador dava 1,09:1 sobre o trilho claro. A primeira correção do Alto Contraste passava nos testes, mas a conferência no preview mostrou o rótulo sumindo atrás de uma placa `Canvas`. No E2E, a mutação mostrou que "o chip remove o primeiro estado, não o clicado" passava na suíte inteira, porque todo teste clicava o primeiro. O review achou ainda duas asserções que nunca falhavam.

**Abordagem final:**
O fundo só fecha o sheet se a pressão e a soltura caem nele, o duplo clique é ignorado em captura e o `scrollbar-gutter: stable` fica na própria trava. As pílulas usam os mesmos checkbox e rádios do painel, com o input fora da vista, e o estado marcado sai de `:has(:checked)`. No Alto Contraste, o segmento ativo vai a `Highlight` com `forced-color-adjust: none`, e o E2E lê os pixels do nome. O E2E clica o chip do segundo estado e cada asserção tem um mutante que a derruba.

## M6 · Ordenação

### 🔧 Prompt: Ordenar no BFF

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
Ordenação no `/api/customers` com as seis ordens do protótipo, collator pt-BR e a chave `sort` na URL ([#28](https://github.com/adamsalves/customer-directory/issues/28), ADR-0004, ADR-0021).

**O que aconteceu:**
As datas são ordenadas pelo timestamp e não pela idade, que empata em 194 dos 200 registros. O sobrenome precisou do truque do protótipo, uma palavra na frente antes do `titleCase`: sem ele, "da Cruz" virava "Da Cruz" em 7 dos 20 clientes da fixture. A mutação matou 31 de 32 mutantes. Ela também mostrou que zerar o `sort` em seis escritores da lista (busca, chips, painel, paginação…) passava na suíte inteira, porque nenhum teste partia de uma URL com `sort`. Isso virou critério da #29. O review achou o nome inteiro montado por um terceiro `titleCase`, que só batia com as partes na fixture. Com o primeiro nome vazio, saía "Da Cruz" ao lado do sobrenome "da Cruz".

**Abordagem final:**
Uma tabela de comparadores sobre `Intl.Collator('pt-BR', { sensitivity: 'base' })`, aplicada depois dos filtros e antes do corte da página. O `toSorted` evita reordenar o array do cache. `name` passou a ser o primeiro nome mais o sobrenome. A ordem padrão é "Nome" e não aparece na URL.

### 🔧 Prompt: A contagem e o select

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
A toolbar com "Exibindo X–Y de N clientes" anunciada ao leitor de tela ([#103](https://github.com/adamsalves/customer-directory/issues/103)) e o select "Ordenar por" no cartão do desktop e na barra do sheet no mobile ([#29](https://github.com/adamsalves/customer-directory/issues/29)). A issue foi dividida em duas porque a estimativa dava ~490 linhas.

**O que aconteceu:**
Mesmo dividida, a #103 fechou com +425 contra ~200 e a #29 com +884 contra ~300, quase tudo E2E que fixa o estilo nos dois temas. Aprovei a exceção ao teto na #29.

- No review da toolbar, a troca de página deixava a contagem nova sob a barra sticky, ao contrário do `goPage` do protótipo.
- No review do select, tocar no chevron da pílula não abria a lista. O espaço do ícone era padding do rótulo, e o toque só focava o select.
- Outro achado dizia que uma escolha feita antes da hidratação ficava na tela. Um E2E que segurava os scripts mostrou que o Vue reescreve o `:selected` ao hidratar, e a correção não entrou.
- A mutação mostrou que o `watch` do painel de filtros, de uma issue anterior, sobrevive à suíte unitária inteira ([#105](https://github.com/adamsalves/customer-directory/issues/105)).

**Abordagem final:**
Um `<p role="status">` sempre no DOM, para que só o texto mude. É um elemento só, que o CSS mostra como linha abaixo de 960px e como cartão acima. A troca de página rola até a toolbar e deixa o foco nos resultados. O `SortSelect` é um `<select>` nativo com as duas variantes no HTML, uma visível por largura, e o espaço do chevron é padding do próprio select. A escolha volta à página 1, e os sete escritores da lista ganharam testes que partem de `sort=old`.

### 🔧 Prompt: E2E da ordenação

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
Um E2E em que ordenar por sobrenome e por Z–A muda o primeiro card, com `?sort=` na URL junto com busca e filtros ([#30](https://github.com/adamsalves/customer-directory/issues/30)).

**O que aconteceu:**
A medição usou o `queryCustomers` real para achar uma busca com estados que deixa poucos clientes em três ordens diferentes. Ela também mostrou que a fixture de 20 não separa as seis ordens. Na primeira versão, o mutante que tira o desempate pelo primeiro nome sobrevivia, porque a fonte já trazia os dois "Jesus" na ordem certa. O review apontou um par na ordem inversa, os "Nunes", e Goiás entrou no filtro. O review também pediu para ler o HTML do servidor no reload. Recusei porque achava que o `useFetch` reaproveitava o payload do SSR, mas a mutação mostrou o contrário: um SSR que ignora o `sort` gera outra chave, o cliente refaz a busca e corrige a lista, e nenhuma linha via. O PR fechou com +115 contra ~100.

**Abordagem final:**
No desktop, o teste confere os 5 nomes em cada ordem, e não só o primeiro, para que uma escolha que perca a busca ou um estado mude a contagem. No reload, ele lê a ordem dos cards no HTML do servidor. No mobile, ele parte da página 2 e espera os 9 primeiros em Z–A a partir de Quévin Cavalcanti, o último dos 20. Se o Z–A invertesse só a página, viria Bartolomeu Martins. A pílula da barra é conferida depois da escolha e depois de um reload. Cada linha do spec tem um mutante que a derruba.

## M7 · Detalhe

### 🔧 Prompt: O detalhe no BFF

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O `/api/customers/[id]` pelo slug do e-mail, com 404 para o cliente que não existe e 502 para a fonte fora do ar ([#31](https://github.com/adamsalves/customer-directory/issues/31), ADR-0004, ADR-0005, ADR-0006).

**O que aconteceu:**
O measurer mostrou que o 502 nasce fora da função cacheada: o throw é o que mantém a cópia antiga no SWR. A mutação de 22 mutantes deixou 9 vivos no plano, e cada um ganhou o teste que o mata (o id vazio, o `eleuterio-almeida-2`, o `statusText` do 404…). O review moveu os testes do detalhe para um spec ao lado do handler e fez o AGENTS.md citar `fetchCustomers` e `loadCustomers`. Um achado fora dos critérios, o `TypeError: terminated` do ofetch com a fonte cortada no meio, virou issue própria ([#110](https://github.com/adamsalves/customer-directory/issues/110), M9).

**Abordagem final:**
O handler procura o slug por igualdade e responde `createError` com o status da fonte: `ICustomerDetailResponse { customer }` em `shared/types/`, com o Nitro inferindo o tipo da rota. O `loadCustomers` em `server/utils/` serve os dois handlers, e o log passa a citar quem falhou.

### 🔧 Prompt: A página do cliente

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
A página `/customers/[id]` com hero, seções de informação e o botão de copiar e-mail ([#32](https://github.com/adamsalves/customer-directory/issues/32), [#33](https://github.com/adamsalves/customer-directory/issues/33), [#111](https://github.com/adamsalves/customer-directory/issues/111), [#114](https://github.com/adamsalves/customer-directory/issues/114), [#116](https://github.com/adamsalves/customer-directory/issues/116)), com o tema por cookie já servindo a página construída.

**O que aconteceu:**
A #32 passou do teto (+747 −81) e foi aceita como exceção: o hero e a página são uma unidade, e tirar a idade da função cacheada era o critério do `age`. O `encodeURIComponent` do slug, que o harness de teste decodifica antes, foi provado por HTTP. O review da #33 achou o `useId` para o `aria-labelledby`, e o botão da #116 perdeu o `aria-label` junto do `title`, que o Chrome expunha como nome _e_ descrição. Na #114, o `left: 50%` encolhia o balão à metade da tela e "Não foi possível copiar" quebrava a 320px: virou `max-content` no review. A #33 passou de ~450 linhas e virou as três issues; o patch da #116, sem linhas de índice, foi reaplicado à mão.

**Abordagem final:**
A idade conta no render, em UTC, e o cache não congela mais o "anos" no copy. O erro da página vira `createError({ status, statusText, fatal: true })`, que o SSR já responde. As seções são uma grade de `240px` por container query, o avatar tem as iniciais em `40cqi` quando a foto falha, e o toast vive no layout com `useState` e o timer no módulo.

### 🔧 Prompt: Erro, SEO e o tema em plugin

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O tema nos atributos globais num plugin universal ([#119](https://github.com/adamsalves/customer-directory/issues/119), ADR-0011) e a página de erro com o layout + o SEO das três telas ([#34](https://github.com/adamsalves/customer-directory/issues/34)).

**O que aconteceu:**
O plano previa `app:mounted`, que dispara antes de o layout hidratar: 8 de 8 carregamentos deram mismatch no rótulo do toggle. O `app:suspense:resolve` deixou 0 avisos em 18. O review guardou o `MediaQueryList` no escopo do plugin (há motores que já coletaram um objeto só apontado pelo próprio listener, e o silenciam) e tirou o 5º caso de teste, que chamava o `app:mounted` global e reexecutava os assinantes do Nuxt. Na #34, a pílula "Ver lista de clientes" com `block-size` fixo vazava com o zoom só de texto: virou `min-block-size`, com E2E que sobe a fonte para 30px. Todo 404 diz "Cliente não encontrado", decisão depois separada na #122 (M9).

**Abordagem final:**
`error.vue` dentro do `<NuxtLayout>`: o header, o toggle e o toast voltam. `role="alert"` só no título e no texto, e o link leva à lista: a navegação que chega ao destino já limpa o erro, sem `clearError`. SEO dos três estados com `useSeoMeta`.

### 🔧 Prompt: Do card ao E2E de cada estilo

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O card ligado ao detalhe com o estado da lista na volta ([#35](https://github.com/adamsalves/customer-directory/issues/35)), a ida e volta completa ([#36](https://github.com/adamsalves/customer-directory/issues/36)) e os E2E que fixam cada estilo do conteúdo ([#124](https://github.com/adamsalves/customer-directory/issues/124), [#125](https://github.com/adamsalves/customer-directory/issues/125), [#126](https://github.com/adamsalves/customer-directory/issues/126), [#129](https://github.com/adamsalves/customer-directory/issues/129)).

**O que aconteceu:**
A #35 saiu de ~330 linhas para +763: exceção aprovada, com o E2E do anel do card lendo pixels no meio de cada lado. A #36 achou a corrida dos 300 ms e o relógio parado que trava o `router.beforeResolve` do Nuxt 4.6, avançado em passos no `expect.poll`. Nos E2E de estilo: o `data-v-app` não prova hidratação de SSR (o Nuxt usa `createSSRApp`); `fonts.ready` sozinho resolve sem a Roboto, e o teste passava com a fonte de reserva; as colunas de 367,5px punham o trilho do lado errado do corte se arredondadas; e o `border: 1px` sem `border-style` é mutante equivalente, porque o Chromium computa `border-width` como 0px. No toast, o toggle com o relógio parado não chegava ao `<html>`: o teste de tema clica com o relógio rodando e só depois para o relógio.

**Abordagem final:**
O link do card leva a query do estado em voo (`pending() ?? query`, ADR-0023) e o "Voltar" reabre a lista nela. Cada spec de estilo é desktop com a largura própria, tema pelo cookie `jsm-theme` com guarda do `data-theme`, fontes provadas com `fonts.check` e `forcedColors` lido da página: uma asserção por declaração, com mutante morto por asserção.

## M8 · Navegação

### 🔧 Prompt: Vizinhos, relacionados e a navegação

**Ferramenta:** Claude Code + sub-agentes

**O que pedi:**
O contexto de navegação no BFF ([#37](https://github.com/adamsalves/customer-directory/issues/37)) e os componentes no detalhe: "Anterior/Próximo" ([#38](https://github.com/adamsalves/customer-directory/issues/38)) e "Outros clientes em {Estado}" com o "Ver todos" ([#39](https://github.com/adamsalves/customer-directory/issues/39)).

**O que aconteceu:**
O `detailContext` calculou a posição no contexto sem ler `page`/`perPage`, e o "N de M" só ficou certo porque a página passou a mandar a query ao BFF. No review da #39 a guarda sem prova para 1 card foi achada (mutantes `>1` e `>=4` sobreviviam à suíte inteira), e o estado fora dos 27 filtrava em silêncio: hoje o link some e os cards ficam. Os dois componentes saíram com pendência explícita: identidade visual para o E2E.

**Abordagem final:**
Uma marcação só, posicionada por `grid-areas`, com os vãos `aria-hidden` segurando o lado sem vizinho; os links guardam a query de volta com `serializeListQuery`; "Ver todos de {Estado}" só existe dentro dos 27 estados; 4 relacionados por nome, como no protótipo.

### 🔧 Prompt: A jornada e a identidade no E2E

**Ferramenta:** opencode + sub-agentes (main planner → implementer → reviewer)

**O que pedi:**
O E2E da jornada completa de navegação ([#40](https://github.com/adamsalves/customer-directory/issues/40)) e, em seguida, a identidade visual dos componentes no E2E ([#137](https://github.com/adamsalves/customer-directory/issues/137)), a última do M8, com o fluxo de release na sequência.

**O que aconteceu:**
Na #40 o sub-agente 1 computou as ordens da própria fixture (Deolindo da Cunha abre a página 2 de `search=a`, posição "10 de 20"), o implementer aprendeu na bobagem real o que o plano errou (chip "Masculino", `page` antes de `search` na URL, rádio) e o 2 recomputou o fold e o collator do zero. Na #137 a decodificação do protótipo confirmou declaração por declaração (1:1) e revelou o `:active` do protótipo pintando o rótulo de `text-strong`, que o impl não faz: registrado na ADR-0013 por escolha do dono. A fixture de 20 não tem estado com 3 clientes: related nunca passa de 1 card, e a "rolagem" só existe com a coluna alargada em teste — e nem assim o Chromium do teste voltou ao repouso do snap: o `scrollLeft` ficou cru no máximo depois de qualquer rolagem, e a volta a zero do plano não se mostrou.

**Abordagem final:**
Jornada num só teste encadeado, esperando o estado escrito antes de cada ato (ADR-0023); identidade num arquivo por largura, `:active` por `mouse.down` + ponteiro longe (é o afastamento, e não a chegada do ponteiro, que prova a regra), ghosts provados em "1 de 1", `72%` conferido por folha e pela caixa medida, e o snap fixado no computed `scroll-snap-type: x mandatory`, com a volta do `scrollLeft` a zero do plano e a parte "rolagem" do critério pendentes sem a prova no Chrome. O `ai-journey/` fechou o M8 no mesmo PR.
