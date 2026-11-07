import type { ICustomer, ICustomerCard } from '#shared/types/customer'
import type { IListQuery } from '#shared/utils/listQuery'
import { filterAndSort, sortCustomers, toCard } from './queryCustomers'

// The context of a detail page from the query of the list its address carries: the position
// (1-based) of the customer in the list filtered and sorted by the query, its size, the neighbors
// straight before and after, and up to 4 others from the same state
export interface IDetailContext {
  position: number
  // The length of the context the position was counted in, not the total of the whole list
  total: number
  prev: ICustomerCard | null
  next: ICustomerCard | null
  related: ICustomerCard[]
}

// The customer straight before and straight after the position given, and neither at either end:
// the slices of a single element carry each neighbor when one exists
function neighbors(context: ICustomer[], index: number): Pick<IDetailContext, 'prev' | 'next'> {
  const [before] = context.slice(index - 1, index)
  const [after] = context.slice(index + 1, index + 2)
  return {
    prev: before === undefined ? null : toCard(before),
    next: after === undefined ? null : toCard(after),
  }
}

// Up to 4 customers of the same state as the customer, itself left out, by name: the related side
// is always in the order of the name, whatever the address asks for. A state outside the 27 has
// none of the table, and still groups the customers the source says it has.
function relatedOf(customers: ICustomer[], customer: ICustomer): ICustomerCard[] {
  return sortCustomers(
    customers.filter(
      (candidate) => candidate.stateSlug === customer.stateSlug && candidate.slug !== customer.slug,
    ),
    'name',
  )
    .slice(0, 4)
    .map(toCard)
}

// The context the address gives the customer (ADR-0004): the list filtered and sorted by its query;
// when the search or a filter leaves the customer out, every customer takes its place, still in
// the order of the sort. The page and its size play no part: one page of the address answers like
// another. The customer comes from the same list the handler read it from, so the fallback finds
// it, and its position is 1-based.
export function detailContext(
  customers: ICustomer[],
  customer: ICustomer,
  query: IListQuery,
): IDetailContext {
  const filtered = filterAndSort(customers, query)
  const foundAt = filtered.indexOf(customer)
  const context = foundAt >= 0 ? filtered : sortCustomers(customers, query.sort)
  const index = foundAt >= 0 ? foundAt : context.indexOf(customer)
  return {
    position: index + 1,
    total: context.length,
    ...neighbors(context, index),
    related: relatedOf(customers, customer),
  }
}
