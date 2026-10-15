# 0006. Slug do cliente a partir do email

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

A API não tem `id`. O protótipo usa a posição no array (`/membros/7`), que muda se a ordem da fonte mudar e quebra links compartilhados. O `email` é único nos 200 registros.

## Decisão

O identificador público é o slug da parte local do email: `ione.dacosta@example.com` → `ione-dacosta`. Ele é gerado no `normalizeCustomer` e usado na rota `/membros/[id]` e como `:key`.

## Consequências

- Links estáveis e legíveis.
- Se a fonte passar a ter emails repetidos, o slug colide. Hoje não acontece, e um teste sobre a fixture garante a unicidade.
