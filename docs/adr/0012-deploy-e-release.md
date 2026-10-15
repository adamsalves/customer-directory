# 0012. Deploy na Vercel e release por milestone

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

Os avaliadores precisam navegar no app, e cada PR precisa ser conferido visualmente antes do merge.

## Decisão

- **Deploy:** integração Git nativa da Vercel (preset do Nitro). Cada PR ganha um preview e cada merge na `main` vai para produção. Sem workflow de deploy no Actions, sem staging e sem variáveis de ambiente (o S3 é público).
- **Release:** ao fechar cada milestone, uma tag semver e uma GitHub Release com notas geradas (`gh release create vX.Y.0 --generate-notes`), agrupadas pelos labels de tipo via `.github/release.yml`. M1 = `v0.1.0` … M8 = `v0.8.0`; a entrega (M9) é a `v1.0.0`.

## Consequências

- Preview em todo PR desde o primeiro milestone.
- As releases contam a evolução feature por feature, com link para cada PR.
- Sem semantic-release, changesets ou `CHANGELOG.md`: não há consumidores de versão, e as releases fazem o papel do changelog.
