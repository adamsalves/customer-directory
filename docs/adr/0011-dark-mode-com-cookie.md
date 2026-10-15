# 0011. Dark mode com toggle e preferência em cookie

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

O protótipo v2 tem dark mode com toggle e guarda a escolha em `localStorage`. Com SSR, o servidor não lê `localStorage`, então a página sairia no tema errado e trocaria depois (flash).

## Decisão

- A escolha fica no cookie `jsm-theme`. O servidor lê o cookie e já renderiza `<html data-theme="…">`.
- Sem cookie, um script inline pequeno aplica `prefers-color-scheme` antes da pintura e acompanha mudanças do sistema até o usuário clicar no toggle.
- Os dois ícones do toggle vão no HTML, e o CSS mostra um conforme `[data-theme]`.

## Consequências

- Sem flash e sem hydration mismatch.
- O parâmetro `?tema=` do protótipo não é implementado; o E2E força o tema pelo cookie.
