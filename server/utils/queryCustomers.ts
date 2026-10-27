import type {
  ICustomer,
  ICustomerCard,
  ICustomerFacets,
  ICustomerListResponse,
} from '#shared/types/customer'
import { BRAZILIAN_STATES } from '#shared/utils/brazilianStates'
import type { IListQuery } from '#shared/utils/listQuery'
import { foldText } from './foldText'

// Picks the card fields one by one: the list never carries email, phone and the rest of ICustomer
function toCard({
  slug,
  name,
  street,
  city,
  state,
  uf,
  postcode,
  picture,
}: ICustomer): ICustomerCard {
  return { slug, name, street, city, state, uf, postcode, picture }
}

// The customers whose name has every word of the search, accents and case aside ("girao rosa" finds
// "Girão da Rosa"). A blank search keeps everyone without folding a single name: it is the most
// common request (no search at all), and nothing caches it per query.
function searchByName(customers: ICustomer[], search: string): ICustomer[] {
  const words = foldText(search)
    .split(/\s+/)
    .filter((word) => word !== '')
  if (words.length === 0) return customers
  return customers.filter(({ name }) => {
    const folded = foldText(name)
    return words.every((word) => folded.includes(word))
  })
}

function filterByGender(customers: ICustomer[], gender: IListQuery['gender']): ICustomer[] {
  return gender === 'all' ? customers : customers.filter((customer) => customer.gender === gender)
}

// Any of the states; none is every state
function filterByStates(customers: ICustomer[], states: string[]): ICustomer[] {
  if (states.length === 0) return customers
  const named = new Set(states)
  return customers.filter(({ stateSlug }) => named.has(stateSlug))
}

// `byGender` has the search and the gender applied, `byStates` the search and the states: each
// count leaves out the filter it belongs to (ICustomerFacets). A customer whose state is not one of
// the 27 counts in no state, and still counts in `all`.
function countFacets(byGender: ICustomer[], byStates: ICustomer[]): ICustomerFacets {
  const perState = new Map<string, number>()
  for (const { stateSlug } of byGender) {
    perState.set(stateSlug, (perState.get(stateSlug) ?? 0) + 1)
  }
  const ofGender = (gender: ICustomer['gender']) =>
    byStates.filter((customer) => customer.gender === gender).length
  return {
    states: Object.fromEntries(BRAZILIAN_STATES.map(({ slug }) => [slug, perState.get(slug) ?? 0])),
    gender: { all: byStates.length, female: ofGender('female'), male: ofGender('male') },
  }
}

// One page of the list, after the search and the filters: the total and the pages count what
// matched. A page past the end is clamped to the last one, so a stale link still shows customers; an
// empty list is page 1 of 1. The facets count the whole list, not the page.
export function queryCustomers(customers: ICustomer[], query: IListQuery): ICustomerListResponse {
  const { perPage } = query
  const bySearch = searchByName(customers, query.search)
  const byGender = filterByGender(bySearch, query.gender)
  const byStates = filterByStates(bySearch, query.states)
  const matches = filterByStates(byGender, query.states)
  const total = matches.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(query.page, totalPages)
  const start = (page - 1) * perPage
  return {
    items: matches.slice(start, start + perPage).map(toCard),
    total,
    page,
    perPage,
    totalPages,
    facets: countFacets(byGender, byStates),
  }
}
