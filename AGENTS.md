# AGENTS.md

Instructions for any coding agent (Claude Code, Copilot, Cursor, Codex…) working in this repository.

## 1. Project

Customer directory for the [JSM frontend challenge](https://github.com/juntossomosmais/frontend-challenge): list with search, filters, sort and pagination, plus a customer detail page.

- **Stack:** Nuxt 4 (Vue 3 + TypeScript, SSR), Nitro as BFF, CSS Modules + SCSS, Vitest, Playwright, npm (ADR-0018). Deployed on Vercel.
- **Data source:** `https://jsm-challenges.s3.amazonaws.com/frontend-challenge.json` (200 records, no `id`).
- **UI source of truth:** the v2 prototype in `docs/design/` (`diretorio-de-membros.html` for the full app, `diretorio-de-membros-responsivo.html` for 375/768 frames). Deviations are recorded in ADR-0013.
- **Decisions:** `docs/adr/` (index in `docs/adr/README.md`). Read the related ADRs before changing anything they cover.

## 2. Commands

```sh
npm ci              # install from package-lock.json
npm run dev         # dev server
npm run build       # production build
npm run lint        # eslint + stylelint + prettier --check
npm run format      # prettier --write
npm run typecheck   # nuxt typecheck
npm test            # vitest (unit, component, API integration)
npm run test:e2e    # playwright
```

## 3. Architecture map

- `server/` — BFF. `api/` holds thin handlers; `utils/` holds **pure functions** (`queryCustomers`, `normalizeCustomer`, `parseRawCustomers`) plus the cached S3 fetch.
- `shared/` — types and utils used by both sides (`listQuery`, `brazilianStates`, `pageList`).
- `app/` — pages, layouts, components (`app/components/Name/Name.vue` + `Name.module.scss`), composables.
- **State:** the URL is the source of truth for the list (search, filters, sort, page). Server state lives in `useFetch`. `useState` is only for theme and toast. No global store (ADR-0007).
- `parseListQuery` in `shared/utils/listQuery.ts` is the **only** place that maps the pt-BR public URL to the English `IListQuery`.

## 4. Hard rules

- **Language:** code, identifiers, files, CSS classes, `data-testid`, comments and commits in **English**. Everything the user sees (labels, `aria-label`, toasts, meta, **public URL** like `/clientes?busca=`) in **pt-BR**. Docs (ADRs, README, issues, PRs, `ai-journey/`) in pt-BR.
- **Honest typing** (ADR-0016) — forbidden, with the alternative:
  | Forbidden                                                              | Do instead                                                          |
  | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
  | `any` (explicit or implicit)                                           | `unknown` + type guard                                              |
  | `as X`, `<X>value`                                                     | narrow with a guard, `instanceof`, `satisfies` (`as const` is fine) |
  | non-null `!`                                                           | handle the `undefined` branch                                       |
  | `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`                        | fix the type                                                        |
  | `$fetch<T>()`, `JSON.parse(x) as T`, `useFetch<T>` on unvalidated data | let Nitro infer route types; validate external data                 |
  | `event.target as HTMLInputElement`                                     | `v-model` or `instanceof HTMLInputElement`                          |
- **External data enters as `unknown`** (S3 payload, `getQuery`, `route.query`) and is validated before use.
- **JSM guideline:** `ComponentName/ComponentName.vue` + `.module.scss` imported as `S`; multi-word component names; typed props; `computed` over methods; stable `:key`; `type TFoo` for local types, `export interface IFoo` for exported ones; `data-testid="page__element--type"`.
- **Styling:** tokens only, always via `var(--…)` from `app/assets/styles/tokens.scss`. No loose colors. Logical properties, container queries, `@layer`. Layout is CSS-only (no width checks in JS, ADR-0014).
- **Components are built from scratch on native HTML** (`<dialog>`, native checkbox/radio/select, `<nav>`, `<dl>`). No UI or headless component library.
- **No new dependency** without an ADR.

## 5. Testing

- Tests live **next to the code**: `Name/Name.spec.ts`, `server/utils/x.spec.ts`. E2E in `tests/e2e/`.
- Use the local fixture, never the network.
- Select elements by `data-testid`. Use `it`.
- **Every bug fix ships a regression test that fails without the fix.**

## 6. Workflow

- **GitHub Flow:** `main` is the only long-lived branch. Branch `<type>/<issue>-<slug>` (e.g. `feat/14-search-field`) from `main`, open a PR back to `main` with `Closes #N`.
- **1 issue = 1 branch = 1 PR**, at most ~400 changed lines (excluding lockfile, fixtures, snapshots, SVG). Bigger than that: split the issue first.
- **Squash merge.** PR title in Conventional Commits (English), e.g. `feat(list): add pagination nav`.
- PR body follows `.github/pull_request_template.md`. Issue body follows `.github/ISSUE_TEMPLATE/`.
- Conventional Commits in English. Never use `--no-verify`.
- Every new decision becomes an ADR in `docs/adr/`.
- Update `ai-journey/` when a milestone closes.
- **Never push, publish issues/releases, change repo settings or deploy without an explicit request.**

## 7. Definition of done

- **PR:** lint + typecheck + test green; tests for what was added; visual check against `docs/design/` on the Vercel preview in **both themes**; no a11y regression (keyboard, accessible names, contrast).
- **Milestone:** all issues closed, the feature's E2E green, preview checked, tag + GitHub Release (only on request).
