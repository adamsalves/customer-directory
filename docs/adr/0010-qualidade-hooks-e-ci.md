# 0010. Qualidade: hooks locais e CI

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

Formatação e mensagens de commit fora do padrão viram ruído no review. Rodar typecheck e testes a cada commit deixa o commit lento.

## Decisão

- **Lint:** `@nuxt/eslint` com regras que usam tipos (ADR-0016), Prettier com `eslint-config-prettier` (desliga as regras de formatação do ESLint que brigariam com o Prettier) e Stylelint com `stylelint-config-standard-scss` (classes em PascalCase e cores só por token, ADR-0003). `npm run lint` roda os três.
- **husky v9** + **lint-staged** no `pre-commit` (eslint/stylelint/prettier só nos arquivos do commit).
- **commitlint** (`@commitlint/config-conventional`) no `commit-msg`.
- **GitHub Actions** roda lint, typecheck, test e e2e em cada push e PR. O CI é o check obrigatório para o merge na `main` protegida.
- Fluxo: GitHub Flow, 1 issue = 1 PR de ~400 linhas no máximo, squash merge com título em Conventional Commits. Templates de PR e issue em `.github/`.

## Consequências

- Commits rápidos e já formatados.
- Nada entra na `main` sem CI verde.
- Histórico linear com um commit por issue, rastreável até o PR.
