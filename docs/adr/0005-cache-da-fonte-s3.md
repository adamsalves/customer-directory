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
- Se a fonte falha e não há cópia em cache, o handler responde 502 (Bad Gateway), qualquer que seja o erro da fonte (403, 5xx, rede, timeout, payload fora do formato). Um erro que não vem da fonte (um bug no código) segue como 500. A página não repete a requisição sozinha (`retry: false` no `useFetch`): o ofetch repetiria o GET no 502, lendo a fonte duas vezes e dobrando o tempo até o estado de erro, que já tem o botão "Tentar novamente". Com cópia em cache, o SWR segue servindo a antiga. A conversão fica no handler de `/api/customers`, e não em `fetchCustomers`: lá o erro precisa subir para o SWR manter a cópia antiga.
