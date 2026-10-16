# Aprendizados

## ✅ O que funcionou bem

- **Planejar sem código.** Uma conversa inteira só de plano, com as decisões viradas em ADR antes do primeiro commit. Quando uma dúvida voltava ("buscar direto no S3?"), a resposta já estava escrita com o motivo.
- **Pedir que a IA revise, não só que produza.** A revisão do protótipo achou um bug real (`--overlay` apontando para si mesma) e dois contrastes abaixo do WCAG AA que eu não teria visto a olho.
- **PRs pequenos com review independente.** No M1, a maioria dos PRs teve achados reais no review feito por um sub-agente sem o contexto da implementação. Exemplos:
  - a regra do ESLint contra `$fetch<T>` não pegava `$fetch.raw<T>`, e as regras do TypeScript não rodam no `<template>` do Vue, onde `as` e `!` passavam;
  - o Stylelint não lia `<style>` dentro de `.vue`;
  - o pre-commit só tinha sido testado com `.ts`, e `.css`, `.yaml`, `.cjs` e `.mts` passavam no commit e quebravam no CI;
  - o Playwright reaproveitava um build velho já servido na porta e dava verde com a página quebrada.
- **Provar a ferramenta quebrando de propósito.** Uma regra de lint ou um teste só conta depois de falhar com o erro que deveria pegar. Foi assim que o cache de módulos do Vitest 5 apareceu: a primeira execução passava por sorte.

## ❌ O que não funcionou

- **Confiar no primeiro verde.** No M1, vários setups pareciam completos porque o caminho feliz passava: o Vitest, o E2E e o cache do GitHub Actions, cujo ramo de cache-hit nunca roda na primeira execução de um PR.
- **Dependências que entram por tabela.** O commitlint trouxe `@types/node` 26 como peer, e o typecheck aceitava APIs que não existem no Node 24 do runtime. O `typescript` 7 quebra o `vue-tsc` sem aviso de peer. Ambos só apareceram lendo o lockfile.
- **Corpo do PR escrito de memória.** Versões e contagem de linhas no texto do PR divergiram do diff. O review pegou, e passei a recontar a cada commit.
- **IA sem contexto procura no lugar errado.** Logo no início, a pergunta sobre o comportamento da busca foi respondida procurando código num repositório vazio, em vez de ler o plano.

## 🔄 O que eu faria diferente

- Escrever a prova de cada configuração (o arquivo que deve falhar) junto com a issue, e não depois do review.
- Fixar desde o início as dependências que vêm por peer e conferir o lockfile a cada `npm install`.
- Colocar os labels da issue no PR desde o primeiro: as notas de release são agrupadas pelos labels do PR.
