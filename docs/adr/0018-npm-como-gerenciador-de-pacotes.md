# ADR 0018 — npm como gerenciador de pacotes

**Status:** Aceito

**Data:** 2026-10-15

## Contexto

O scaffold (#1) entrou com pnpm (`"packageManager": "pnpm@10.32.1"` e `pnpm-lock.yaml`), sem uma decisão registrada. Ao revisar a escolha, o projeto passou para npm (#47).

As opções eram npm, pnpm, Yarn e Bun.

## Decisão

Usar o **npm** que vem com o Node 24 (`.nvmrc` e `engines`). O `package-lock.json` é o único lockfile versionado, e o install reproduzível é `npm ci`.

O `pnpm-lock.yaml` foi removido num commit normal. O histórico da `main` não foi reescrito, porque isso exigiria force push e o arquivo continuaria acessível pelo PR #46.

## Motivação

1. **Funciona para quem clona.** O npm já vem com o Node. Não precisa de Corepack nem de install global, e nenhum avaliador do desafio esbarra num gerenciador que não tem.
2. **Uma ferramenta a menos.** Node e npm andam juntos na mesma versão. O CI e a Vercel (que detecta o `package-lock.json`) usam o npm sem configuração extra.
3. **Scripts de install sob controle também no npm.** O npm 11 ainda roda scripts de install não revisados (só avisa), mas respeita o que estiver negado em `allowScripts`. O `esbuild` fica como `false`, porque o binário chega pelas `optionalDependencies` e o build funciona sem o script, a mesma decisão que existia no pnpm.

O pnpm foi descartado por exigir uma ferramenta além do Node, mesmo tendo `node_modules` estrito. Yarn e Bun foram descartados pelo mesmo motivo, e o Bun ainda traria um segundo runtime só para o install.

## Consequências

### Positivas

- `git clone` + `npm ci` basta, com qualquer Node 24.
- Um lockfile só, lido nativamente pelo CI e pela Vercel.

### Tradeoffs aceitos

- **Dependências fantasmas.** O npm achata o `node_modules`, então um `import` de pacote que não está no `package.json` pode funcionar por acaso. Dá para pegar isso no ESLint (#2) com `import/no-extraneous-dependencies` ou uma regra equivalente.
- **Outros gerenciadores não são barrados.** `pnpm install` ou `yarn install` rodam e geram outro lockfile, que não deve ser commitado.
