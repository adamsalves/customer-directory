# 0005. Cache da fonte S3

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

Buscar e normalizar os 200 registros a cada requisição desperdiça tempo e deixa o app dependente da latência do S3. Os dados mudam raramente.

## Decisão

`server/utils/fetchCustomers.ts` usa `defineCachedFunction` com `maxAge` de 1h e `swr: true`. O cache guarda a lista já validada e normalizada.

## Consequências

- Busca, filtro e paginação rodam em memória sobre os dados em cache.
- Quando o cache expira, o próximo pedido recebe o valor antigo enquanto o novo é buscado (stale-while-revalidate).
- Uma mudança no S3 pode levar até 1h para aparecer, o que é aceitável aqui.
