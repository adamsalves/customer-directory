import type { ICustomer, ICustomerCard, ICustomerListResponse } from '#shared/types/customer'
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
// "Girão da Rosa"). A blank search has no words and keeps everyone. Dropping the empty words and
// returning early only skip the pass over the list: an empty word is in every name, so the result
// is the same without them.
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

// One page of the list, after the search: the total and the pages count what matched. A page past
// the end is clamped to the last one, so a stale link still shows customers; an empty list is
// page 1 of 1.
export function queryCustomers(customers: ICustomer[], query: IListQuery): ICustomerListResponse {
  const { perPage } = query
  const matches = searchByName(customers, query.search)
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
  }
}
