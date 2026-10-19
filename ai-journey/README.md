# Jornada com IA

Como usei IA neste projeto. A pasta é atualizada ao fim de cada milestone.

## Ferramenta

- **Claude Code** (CLI), do planejamento ao código, aos reviews e à abertura de PRs.
- **Claude Design**, para o protótipo de UI em `docs/design/`, a partir de prompts que o Claude Code ajudou a escrever.

## Método

- **Planejar antes de codar.** O projeto começou com uma conversa só de planejamento (Fase 0), sem nenhum arquivo no repositório. Cada decisão discutida ali virou uma ADR em [`docs/adr/`](../docs/adr/README.md).
- **Regras escritas para o agente.** O [`AGENTS.md`](../AGENTS.md) fixa stack, arquitetura, regras de tipagem, idioma e fluxo de trabalho. O `CLAUDE.md` só importa o `AGENTS.md` e acrescenta o que é específico do Claude Code. Assim qualquer agente (Copilot, Cursor, Codex) segue as mesmas regras.
- **Protótipo como fonte da verdade.** O layout foi prototipado antes no Claude Design e está em [`docs/design/`](../docs/design/). A IA revisou o protótipo, e os ajustes viraram desvios registrados na ADR-0013.
- **Uma issue, uma branch, um PR**, com no máximo ~400 linhas. PRs pequenos são revisáveis de verdade, por mim e pela IA.
- **Medir, planejar, implementar.** A partir do M2, cada issue passa por quatro etapas: um sub-agente mede o código e devolve números com evidência, o agente principal planeja com base nisso, eu aprovo o plano, e só então outro sub-agente o implementa. O plano parte do que existe no código, não de suposição, e o contexto principal não se enche de arquivos.
- **Review independente em todo PR.** Um sub-agente sem o contexto da implementação revisa o diff contra as regras do repositório. Os achados viram correção no próprio PR e, quando são lições gerais, entram na memória do agente para não se repetirem.
- **Nada é publicado sem comando meu.** Push, issues, releases, configurações do GitHub e deploy só acontecem quando eu peço.

## Linha do tempo

| Milestone             | O que a IA fez                                                    | Registro                                                         |
| --------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| Fase 0 · Planejamento | plano, revisão do protótipo, ADRs, backlog de 9 milestones        | [prompts](prompts.md#fase-0--planejamento)                       |
| M1 · Fundação         | scaffold, lint, hooks, testes, CI, deploy e docs, um PR por issue | [learnings](learnings.md)                                        |
| M2 · Shell + tema     | tokens, fontes, layout, breadcrumb e dark mode por cookie         | [prompts](prompts.md#m2--shell--tema), [learnings](learnings.md) |

## Arquivos

- [`prompts.md`](prompts.md): os prompts que mudaram o rumo do projeto, com o que aconteceu e a abordagem final.
- [`learnings.md`](learnings.md): o que funcionou, o que não funcionou e o que eu faria diferente.
