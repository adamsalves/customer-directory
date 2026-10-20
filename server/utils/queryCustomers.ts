import type { ICustomer, ICustomerCard, ICustomerListResponse } from '#shared/types/customer'
import type { IListQuery } from '#shared/utils/listQuery'

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

// One page of the list. A page past the end is clamped to the last one, so a stale link
// still shows customers; an empty list is page 1 of 1.
export function queryCustomers(customers: ICustomer[], query: IListQuery): ICustomerListResponse {
  const { perPage } = query
  const total = customers.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(query.page, totalPages)
  const start = (page - 1) * perPage
  return {
    items: customers.slice(start, start + perPage).map(toCard),
    total,
    page,
    perPage,
    totalPages,
  }
}
