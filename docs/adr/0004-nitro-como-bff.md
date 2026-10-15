# 0004. Nitro como BFF: busca, filtro, ordenação, paginação e contagens no servidor

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

A fonte é um JSON estático no S3 com 200 registros (~177KB brutos), sem `id`, com texto todo em minúsculas e sem endpoint de busca. O protótipo faz tudo no navegador e precisou de um fallback por causa de CORS.

## Decisão

O Nitro expõe:

- `GET /api/customers` → `{ items, total, page, perPage, totalPages, facets }`;
- `GET /api/customers/[id]` → `{ customer, position, total, prev, next, related }`, com 404 via `createError`.

A lógica fica em funções puras em `server/utils/` (`parseRawCustomers`, `normalizeCustomer`, `queryCustomers`), e os handlers só fazem a ligação.

## Consequências

- O payload por página fica em ~9 cards em vez de 200 registros, o que ajuda no LCP.
- Sem dependência de CORS do S3.
- As funções puras são o alvo principal dos testes unitários.
- O fallback de amostra local do protótipo deixa de ser necessário.
