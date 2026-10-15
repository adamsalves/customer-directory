# 0018. npm como gerenciador de pacotes

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

O scaffold (#1) entrou com pnpm (`packageManager: pnpm@10.32.1` e `pnpm-lock.yaml`) sem uma decisão registrada. O pnpm exige Corepack ou install global, e quem clona o repositório (inclusive quem avalia o desafio) pode não ter. As opções eram npm, pnpm, Yarn e Bun.

## Decisão

- Usar o **npm** que vem com o Node 24 (`.nvmrc` e `engines`). O `package-lock.json` é o único lockfile versionado, e o install reproduzível é `npm ci`.
- Scripts de install de dependências ficam negados em `allowScripts` quando o binário já chega pelas `optionalDependencies` (`esbuild`, `unrs-resolver`). O npm 11 roda scripts não revisados por padrão (só avisa) e respeita os negados.
- `import/no-extraneous-dependencies` como `error` no ESLint, porque o npm achata o `node_modules` e um pacote transitivo seria importável sem estar no `package.json`.
- O `pnpm-lock.yaml` saiu num commit normal (#47). O histórico da `main` não foi reescrito: exigiria force push, e o arquivo continuaria acessível pelo PR #46.

## Consequências

- `git clone` + `npm ci` basta, com qualquer Node 24. O CI e a Vercel leem o `package-lock.json` sem configuração extra.
- Pnpm, Yarn e Bun foram descartados por exigir uma ferramenta além do Node. Perdemos o `node_modules` estrito do pnpm, compensado pela regra do ESLint.
- Nada barra um `pnpm install` ou `yarn install` local. O lockfile que eles geram não deve ser commitado.
