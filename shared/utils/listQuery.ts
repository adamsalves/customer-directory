import { isRecord } from './isRecord'

export interface IListQuery {
  page: number
  perPage: number
  search: string
}

export const PER_PAGE_OPTIONS = [9, 18, 27, 54] as const
export const DEFAULT_PER_PAGE = PER_PAGE_OPTIONS[0]
const DEFAULT_PAGE = 1

// Canonical positive integer: "02", "2.5", "-1" and "" are not one
const POSITIVE_INTEGER = /^[1-9]\d*$/

function parsePositiveInteger(value: unknown): number | undefined {
  return typeof value === 'string' && POSITIVE_INTEGER.test(value) ? Number(value) : undefined
}

// The only place that turns external input (`getQuery`, `route.query`) into an IListQuery
// (ADR-0016). The URL keys are the field names (ADR-0021). Anything that is not a canonical
// value, a repeated key included, falls back to the default. `search` is any string, kept as it
// came (no trim, so the field does not lose a trailing space while the reader types): the words
// are split by the search itself.
export function parseListQuery(input: unknown): IListQuery {
  const source = isRecord(input) ? input : {}
  const perPage = parsePositiveInteger(source.perPage)
  return {
    page: parsePositiveInteger(source.page) ?? DEFAULT_PAGE,
    perPage: PER_PAGE_OPTIONS.find((option) => option === perPage) ?? DEFAULT_PER_PAGE,
    search: typeof source.search === 'string' ? source.search : '',
  }
}

// Inverse of parseListQuery, for links. Defaults stay out of the URL (ADR-0007).
export function serializeListQuery(query: IListQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.page !== DEFAULT_PAGE) params.page = String(query.page)
  if (query.perPage !== DEFAULT_PER_PAGE) params.perPage = String(query.perPage)
  if (query.search !== '') params.search = query.search
  return params
}
