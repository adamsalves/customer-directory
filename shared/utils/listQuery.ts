import { isRecord } from './isRecord'

export interface IListQuery {
  page: number
  perPage: number
  search: string
}

export const PER_PAGE_OPTIONS = [9, 18, 27, 54] as const
export const DEFAULT_PER_PAGE = PER_PAGE_OPTIONS[0]
const DEFAULT_PAGE = 1
// Longer than any name, short enough that the search (every word against every name, on each
// request) stays cheap
export const MAX_SEARCH_LENGTH = 100

// Canonical positive integer: "02", "2.5", "-1" and "" are not one
const POSITIVE_INTEGER = /^[1-9]\d*$/

function parsePositiveInteger(value: unknown): number | undefined {
  return typeof value === 'string' && POSITIVE_INTEGER.test(value) ? Number(value) : undefined
}

// The only place that turns external input (`getQuery`, `route.query`) into an IListQuery
// (ADR-0016). The URL keys are the field names (ADR-0021). Anything that is not a canonical
// value, a repeated key included, falls back to the default. `search` is any string, trimmed so
// "ana " and "ana" are one list state (the field keeps its own draft): the words are split by the
// search itself. A longer search is cut at MAX_SEARCH_LENGTH, and trimmed again so the cut is
// canonical too.
export function parseListQuery(input: unknown): IListQuery {
  const source = isRecord(input) ? input : {}
  const perPage = parsePositiveInteger(source.perPage)
  return {
    page: parsePositiveInteger(source.page) ?? DEFAULT_PAGE,
    perPage: PER_PAGE_OPTIONS.find((option) => option === perPage) ?? DEFAULT_PER_PAGE,
    search:
      typeof source.search === 'string'
        ? source.search.trim().slice(0, MAX_SEARCH_LENGTH).trimEnd()
        : '',
  }
}

// Two parsed list states are the same list. The JSON works because parseListQuery builds every
// IListQuery with its keys in one order.
// ponytail: compares in order, fine while every field is a scalar. Upgrade: when a field is a list
// (the states of #23), compare it as a set.
export function sameListState(a: IListQuery, b: IListQuery): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Inverse of parseListQuery, for links. Defaults stay out of the URL (ADR-0007).
export function serializeListQuery(query: IListQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.page !== DEFAULT_PAGE) params.page = String(query.page)
  if (query.perPage !== DEFAULT_PER_PAGE) params.perPage = String(query.perPage)
  if (query.search !== '') params.search = query.search
  return params
}
