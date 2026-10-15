# 0003. CSS Modules + SCSS seguindo o guideline JSM; componentes em `app/components/`

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

O guideline JSM pede CSS Modules com SCSS, um diretório por componente e tokens em custom properties. Ele também sugere componentes dentro de `pages/**/components`, mas no Nuxt todo `.vue` dentro de `pages/` vira rota.

## Decisão

- Cada componente fica em `app/components/Name/Name.vue` + `Name.module.scss`, importado como `import S from './Name.module.scss'`, com classes em PascalCase.
- Os componentes são feitos do zero sobre HTML nativo (`<dialog>`, checkbox/radio/select nativos, `<nav>`, `<dl>`). Não usamos biblioteca de componentes nem de primitivos headless.
- Estilo usa só tokens (`var(--…)`), propriedades lógicas, container queries e `@layer`.

## Consequências

- Estilo isolado por componente e sem dependência de UI no bundle.
- A acessibilidade vem do próprio HTML. Um primitivo headless só seria reconsiderado (com um ADR novo) se aparecer combobox, autocomplete ou menu com navegação por setas.
- Desvio do guideline (`app/components/` em vez de `pages/**/components`) documentado aqui e no README.
