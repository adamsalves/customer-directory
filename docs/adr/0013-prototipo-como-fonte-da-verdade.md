# 0013. O protótipo é a fonte da verdade de UI

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

O protótipo v2 (`docs/design/diretorio-de-membros.html` e `docs/design/diretorio-de-membros-responsivo.html`) define layout, tokens, textos, comportamento e os dois temas. Os dois arquivos foram gerados no Claude Design.

As molduras de `diretorio-de-membros-responsivo.html` vêm de uma exportação anterior do app e divergem de `diretorio-de-membros.html` no tema claro:

| Item               | `diretorio-de-membros.html` | molduras (`-responsivo`) |
| ------------------ | --------------------------- | ------------------------ |
| `--input-border`   | `#8a8f96`                   | `#9e9e9e` (2,46:1)       |
| `--placeholder`    | `#6b7480`                   | `#8a8f96` (3,26:1)       |
| `--social-bg`      | `#1877c9`                   | `#1da1f2` (2,83:1)       |
| opção de ordenação | "Cadastro mais recente"     | "Cadastro recente"       |

## Decisão

Tokens e textos vêm de `diretorio-de-membros.html`; as molduras de 375 e 768px valem só para layout. A implementação reproduz o protótipo, e os tokens têm os mesmos nomes das custom properties dele. Os desvios são estes:

| Protótipo                                           | Implementação                          | Por quê                           |
| --------------------------------------------------- | -------------------------------------- | --------------------------------- |
| id = posição no array                               | slug do email                          | estável (ADR-0006)                |
| layout por `window.innerWidth`                      | media + container queries              | SSR sem flash (ADR-0014)          |
| sheet em `div role=dialog` com focus trap manual    | `<dialog>` nativo                      | ADR-0015                          |
| pills de estado com `aria-pressed`                  | o mesmo checkbox do painel, estilizado | semântica de formulário           |
| filtro no browser + fallback por CORS               | BFF Nitro                              | ADR-0004                          |
| `hash` routing                                      | rotas reais com SSR                    | SEO e links limpos                |
| tema em `localStorage`                              | cookie `jsm-theme`                     | ADR-0011                          |
| `?tema=`                                            | não implementado                       | só serve às molduras do protótipo |
| `--overlay` claro referencia a si mesmo             | `rgba(20,26,33,.5)`                    | bug: o fundo do sheet sumia       |
| `--input-border` claro `#8a8f96` (2,99:1 no header) | `#858a91` (3,19:1)                     | contraste mínimo de 3:1           |
| texto do `kbd` em `--text-count` (4,34:1)           | `--text-muted` (5,35:1)                | contraste mínimo de 4,5:1         |

## Consequências

- A conferência visual de cada PR é feita contra `docs/design/`, nos dois temas.
- Novo desvio = nova linha nesta tabela.
