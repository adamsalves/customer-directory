# 0016. Tipagem honesta

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

Casts e `any` fazem o type checker aprovar código que quebra em produção, principalmente com dados externos.

## Decisão

- **Proibido:** `any` (inclusive implícito); `as X` e `<X>valor` (`as const` é permitido); non-null `!`; `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`; genéricos usados como cast (`$fetch<T>()`, `JSON.parse(x) as T`, `useFetch<T>` sobre dado não validado).
- **tsconfig:** `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`.
- **`@types/node` na major do runtime** (`^24`, igual ao `engines.node`), declarado em `devDependencies`. Sem isso, o peer `"*"` do commitlint instala a major mais nova, o servidor (que não restringe `types`) passa a tipar APIs que o Node 24 não tem, e o typecheck aprova código que quebra em produção.
- **ESLint typed** com `no-explicit-any`, `consistent-type-assertions: never`, `no-non-null-assertion`, `ban-ts-comment` e as regras `no-unsafe-*`, todas como `error`, inclusive nos testes.
- **Dados externos entram como `unknown`:** o payload do S3 passa por type guards escritos à mão (`parseRawCustomers`); `getQuery` e `route.query` passam por `parseListQuery`. Sem zod/valibot: o formato é pequeno e fixo.

## Consequências

- Erros de formato aparecem na fronteira, não no meio da UI.
- Escrever guards dá mais trabalho no início.
- O CI quebra se alguém contornar a regra.
