# 0008. Sem mapa

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

A API traz `location.coordinates`, mas os valores são aleatórios e caem fora do Brasil (ex.: `-73.67, 142.40`), enquanto cidade e estado são brasileiros.

## Decisão

Não exibir mapa nem coordenadas.

## Consequências

- Sem dependência de biblioteca de mapas nem de tiles de terceiros.
- Evita mostrar uma informação errada ao usuário.
