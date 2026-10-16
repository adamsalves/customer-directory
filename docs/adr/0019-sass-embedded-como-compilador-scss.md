# 0019. sass-embedded como compilador do SCSS

- **Status:** Aceita
- **Data:** 2026-10-16

## Contexto

A ADR-0003 escolheu CSS Modules com SCSS, mas não registrou qual compilador roda os `.scss`. O Vite não traz um: ele carrega o `sass-embedded` e, se não achar, o `sass`. Sem nenhum dos dois, o primeiro `.scss` quebra o dev e o build. Nenhum estava instalado, e o `tokens.scss` (#8) é o primeiro arquivo SCSS do projeto.

## Decisão

- Instalar o `sass-embedded` como `devDependency`, sem configuração: o Vite o usa sozinho.
- Preferido ao `sass` porque o Vite o procura primeiro. É o mesmo Dart Sass, só que rodando no executável do Dart (um processo filho) em vez de JavaScript.
- Não declarar o `sass`: um compilador só.

## Consequências

- O executável vem por pacotes de plataforma em `optionalDependencies` (`sass-embedded-linux-x64` etc.). O lockfile lista todos, e o npm instala só o do ambiente.
- O npm também instala `sass` e `@parcel/watcher`, dependências das variantes `sass-embedded-*-unknown`, que ele pula nesta plataforma mas cujas dependências traz. O Vite continua usando o `sass-embedded`.
- O script de install do `@parcel/watcher` só compila com `npm_config_build_from_source=true`, e o binário chega por `optionalDependencies`. Por isso ele entra negado em `allowScripts`, como `esbuild` e `unrs-resolver` (ADR-0018).
- Voltar ao `sass` é trocar o pacote no `package.json`; os `.scss` não mudam.
