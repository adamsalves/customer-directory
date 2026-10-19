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
