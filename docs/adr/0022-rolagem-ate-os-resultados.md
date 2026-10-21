# 0022. Rolagem até os resultados por hook do router

- **Status:** Aceita
- **Data:** 2026-10-21

## Contexto

Na troca de página ou de itens por página, só a query de `/customers` muda, e o Nuxt mantém a posição de rolagem. Quem clica na página 2 no fim da lista continua vendo o fim da lista nova. No protótipo, o topo dos resultados volta para a tela.

O caminho natural seria um `scrollBehavior` em `app/router.options.ts`. No Nuxt 4.6, porém, ele substitui o comportamento padrão do Nuxt em vez de envolvê-lo, e esse padrão cuida do hash, da troca de rota e do voltar. Como o Nuxt não exporta esse padrão, manter tudo isso exigiria copiar código interno. Além disso, o vue-router 5 marca a opção como obsoleta.

## Decisão

Um plugin cliente (`app/plugins/scrollToResults.client.ts`) escuta o router com `afterEach`. Quando muda `page` ou `perPage` da lista, ele leva o topo dos resultados (`#results`) para logo abaixo do header sticky. A rolagem é suave, e imediata com `prefers-reduced-motion`. Se o topo já está à vista, nada se move. O deslocamento é o `scroll-padding-block-start` do `<html>` somado ao `scroll-margin-block-start` da lista.

Voltar e avançar ficam com o Nuxt e não rolam.

## Consequências

- Hash, skip link e troca de rota continuam sendo do Nuxt.
- A altura do header continua definida num lugar só (`base.scss`).
- Voltar e avançar não restauram a posição salva. Restaurar a posição deixava a página fora do lugar, porque o skeleton e a lista trocam logo depois e deslocam o conteúdo.
- O foco do teclado depois da troca de página (#72) entra neste mesmo plugin.
