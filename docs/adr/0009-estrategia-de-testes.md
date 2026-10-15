# 0009. Estratégia de testes

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

O desafio avalia testes unitários, de integração de fluxos e testes que pegam bugs reais.

## Decisão

- **Unit (Vitest):** funções puras do BFF e de `shared/`.
- **Componentes (`@nuxt/test-utils` + `@vue/test-utils`, ambiente `nuxt`):** seleção por `data-testid`.
- **Integração da API:** `@nuxt/test-utils` sobe o servidor com a fixture e chama `/api/customers` e `/api/customers/<slug>`.
- **E2E (Playwright):** desktop e mobile 375px. Cada milestone de feature termina com o E2E dela.
- **Fixture:** ~20 registros reais da API, validados pelo mesmo type guard. Nenhum teste usa a rede.
- Testes ficam ao lado do código; E2E em `tests/e2e/`.
- Todo bug corrigido ganha um teste de regressão que falha sem a correção.

## Consequências

- Testes rápidos e determinísticos.
- Playwright roda no CI desde o primeiro milestone.
