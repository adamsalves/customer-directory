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
