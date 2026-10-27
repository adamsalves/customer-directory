import { BRAZILIAN_STATES } from './brazilianStates'
import { isRecord } from './isRecord'

export interface IListQuery {
  page: number
  perPage: number
  search: string
  // Slugs of BRAZILIAN_STATES, each once and in the order of that table; none is every state
  states: string[]
  gender: 'all' | 'female' | 'male'
}

export const PER_PAGE_OPTIONS = [9, 18, 27, 54] as const
export const DEFAULT_PER_PAGE = PER_PAGE_OPTIONS[0]
const DEFAULT_PAGE = 1
const DEFAULT_GENDER = 'all'
// Longer than any name, short enough that the search (every word against every name, on each
// request) stays cheap
export const MAX_SEARCH_LENGTH = 100

// Canonical positive integer: "02", "2.5", "-1" and "" are not one
const POSITIVE_INTEGER = /^[1-9]\d*$/

function parsePositiveInteger(value: unknown): number | undefined {
  return typeof value === 'string' && POSITIVE_INTEGER.test(value) ? Number(value) : undefined
}

// The states the value names, each once and in the order of the table, so the spellings of one
// choice ("sao-paulo,bahia", "bahia,sao-paulo,bahia", "bahia,,sao-paulo") are one list state and the
// list ends at 27. Not a string (a repeated key comes as an array): no state.
function parseStates(value: unknown): string[] {
  if (typeof value !== 'string') return []
  const named = new Set(value.split(','))
  return BRAZILIAN_STATES.filter(({ slug }) => named.has(slug)).map(({ slug }) => slug)
}

function parseGender(value: unknown): IListQuery['gender'] {
  return value === 'female' || value === 'male' ? value : DEFAULT_GENDER
}

// The only place that turns external input (`getQuery`, `route.query`) into an IListQuery
// (ADR-0016). The URL keys are the field names (ADR-0021). Anything that is not a canonical
// value, a repeated key included, falls back to the default. `search` is any string, trimmed so
// "ana " and "ana" are one list state (the field keeps its own draft): the words are split by the
// search itself. A longer search is cut at MAX_SEARCH_LENGTH, and trimmed again so the cut is
// canonical too. `states` and `gender` keep only the values they know.
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
    states: parseStates(source.states),
    gender: parseGender(source.gender),
  }
}

// Two parsed list states are the same list. The JSON works because parseListQuery builds every
// IListQuery with its keys in one order, and its states in the order of the table: comparing the
// list in order is comparing it as a set.
export function sameListState(a: IListQuery, b: IListQuery): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Inverse of parseListQuery, for links. Defaults stay out of the URL (ADR-0007). The states go
// through the parser's rule, so a caller that toggles them in any order still writes one URL.
export function serializeListQuery(query: IListQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.page !== DEFAULT_PAGE) params.page = String(query.page)
  if (query.perPage !== DEFAULT_PER_PAGE) params.perPage = String(query.perPage)
  if (query.search !== '') params.search = query.search
  const states = parseStates(query.states.join(','))
  if (states.length > 0) params.states = states.join(',')
  if (query.gender !== DEFAULT_GENDER) params.gender = query.gender
  return params
}
