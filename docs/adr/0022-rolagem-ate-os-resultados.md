# 0022. Rolagem até os resultados por hook do router

- **Status:** Aceita
- **Data:** 2026-10-21

## Contexto

Na troca de página ou de itens por página, só a query de `/customers` muda, e o Nuxt mantém a posição de rolagem. Quem clica na página 2 no fim da lista continua vendo o fim da lista nova. No protótipo, a troca de página (`goPage`) traz o topo dos resultados de volta para a tela. A troca de itens por página não rola.

O caminho natural seria um `scrollBehavior` em `app/router.options.ts`. No Nuxt 4.6, porém, ele substitui o comportamento padrão do Nuxt em vez de envolvê-lo, e esse padrão cuida do hash, da troca de rota e do voltar. Como o Nuxt não exporta esse padrão, manter tudo isso exigiria copiar código interno. Além disso, o vue-router 5 marca a opção como obsoleta, e o substituto (`vue-router/experimental`) ainda é experimental.

## Decisão

Um plugin cliente (`app/plugins/scrollToResults.client.ts`) escuta o router com `afterEach`. Quando só a `page` da lista muda (o `perPage` é o mesmo), ele leva o topo dos resultados (`#results`) para logo abaixo do header sticky. A rolagem é suave, e imediata com `prefers-reduced-motion`. Se o topo já está à vista, nada se move. O deslocamento é o `scroll-padding-block-start` do `<html>` somado ao `scroll-margin-block-start` da lista.

A troca de itens por página não rola, mesmo que ela volte para a página 1: quem a faz está com o foco no `<select>`, e a rolagem o tiraria da tela.

Voltar e avançar ficam com o Nuxt e não rolam.

### Foco e ancoragem do seletor (#72)

- Os resultados são uma `<section id="results" tabindex="-1" aria-label="Resultados">` que envolve o skeleton e a lista. O `<ul>` do skeleton é desmontado quando a lista chega; com o `id` num dos dois `<ul>`, o foco cairia no `<body>` nesse momento.
- O "Tentar novamente" do estado de erro (#17) também leva o foco aos resultados, com `focus({ preventScroll: true })`, antes de chamar o `refresh`. O botão sai quando o skeleton entra; sem isso, o foco cairia no `<body>`. O "Limpar busca e filtros" do estado vazio (#21) segue a mesma regra, pelo mesmo motivo. A `<section>` guarda o skeleton, o erro, o estado vazio e a lista, então ela continua de pé durante a nova busca.
- A troca de página, e só ela, chama `focus({ preventScroll: true })` nos resultados, mesmo quando eles já estão à vista e nada rola. O link da página usado vira o `<span>` da página atual e o foco se perderia. As setas também levam o foco aos resultados, mesmo quando continuam links: a troca é a mesma, e quem pagina chega ao começo da página nova. O custo é voltar às setas com Tab a cada página, o que vai pesar quando os cards virarem links (#35). O foco não rola a página: quem rola é a rolagem descrita acima.
- Voltar e avançar não mexem no foco: o plugin sai antes de chamar `scrollToResults`. A troca de itens por página também não, e o foco fica no `<select>`.
- Na troca de itens por página, o `PaginationNav` devolve o `<select>` ao lugar onde ele estava. A lista acima dele muda de altura duas vezes (lista, skeleton de 9 cards, lista nova) e nada o segura na tela. Com a página no topo (`scrollY` 0, o caso da última página com poucos cards) nenhum navegador ancora, porque a especificação não escolhe âncora na origem da rolagem. O Safari até a versão 26 não tem `overflow-anchor` e não ancora nunca. Com o wrapper dos resultados, que fica de pé na troca, o Chromium também deixou de segurar o select nas páginas do meio (na `main`, sem o wrapper, segurava), então a correção vale para qualquer página.
- O `PaginationNav` guarda o `top` do `<select>` ao trocar, recebe `loading` (o `status` da busca) e, a cada mudança de `loading`, mede de novo num `requestAnimationFrame` e rola a diferença com `window.scrollBy(0, d)`. Medir no quadro seguinte, e não na hora, é uma precaução para o navegador que aplicar a ancoragem nativa depois da leitura (o Chromium dá o mesmo resultado dos dois jeitos). A conta parte sempre do `top` original e é idempotente: se o navegador já segurou o select, `d` é cerca de zero. A âncora some quando o carregamento termina, quando a navegação não acontece ou na primeira rolagem, toque, clique ou tecla do leitor durante o carregamento. Sem essa última regra, a correção desfazia a rolagem que o leitor fizesse enquanto a lista carregava e também a rolagem até os resultados de um link de página clicado nesse meio-tempo. A regra não compara `scrollY`, porque o navegador o recua sozinho quando o skeleton encurta a página.
- O Playwright continua só com Chromium. O caso com `html { overflow-anchor: none }` no E2E simula o Safari anterior ao 27. Um Safari real fica para a conferência manual no preview.

Fontes: [caniuse.com/css-overflow-anchor](https://caniuse.com/css-overflow-anchor) e [drafts.csswg.org/css-scroll-anchoring](https://drafts.csswg.org/css-scroll-anchoring/).

## Consequências

- Hash, skip link e troca de rota continuam sendo do Nuxt.
- A altura do header continua definida num lugar só (`base.scss`).
- Voltar e avançar não restauram a posição salva. Restaurar a posição deixava a página fora do lugar, porque o skeleton e a lista trocam logo depois e deslocam o conteúdo.
- Quando a toolbar sticky do mobile entrar (no protótipo, `top: headerH`, cerca de 61px), o `scroll-padding-block-start` do `<html>` precisa somar a altura dela. Senão os resultados e o destino do skip link ficam embaixo dela.
- O foco do teclado depois da troca de página (#72) segue a regra da rolagem: só na troca de página, nunca ao voltar e avançar. Quem o move é o `scrollToResults`, que ganhou essa segunda tarefa e manteve o nome.
- A página não rola além do próprio fim. Na última página, numa tela mais alta que ela, o rodapé é empurrado para baixo e o `<select>` termina mais abaixo do que estava, ainda na tela.
