# 0001. Registrar decisões de arquitetura em ADRs

- **Status:** Aceita
- **Data:** 2026-10-15

## Contexto

O desafio avalia arquitetura, qualidade e colaboração com IA. Decisões tomadas só em conversa (com pessoas ou com agentes) se perdem, e quem lê o código depois não sabe por que algo é como é.

## Decisão

Toda decisão de arquitetura, de dependência ou de desvio do design vira um ADR em `docs/adr/`, no formato de Michael Nygard (Status · Contexto · Decisão · Consequências), em pt-BR, numerado em sequência. O índice fica em `docs/adr/README.md`.

## Consequências

- O avaliador e os agentes leem o porquê sem depender do histórico da conversa.
- Mudar uma decisão significa um ADR novo marcando o anterior como "Substituída por 00NN".
- Custo pequeno: um arquivo curto por decisão.
