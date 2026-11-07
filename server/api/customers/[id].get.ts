import type { ICustomerDetailResponse } from '#shared/types/customer'
import { parseListQuery } from '#shared/utils/listQuery'
import { detailContext } from '../../utils/detailContext'
import { loadCustomers } from '../../utils/loadCustomers'

export default defineEventHandler(async (event): Promise<ICustomerDetailResponse> => {
  const id = getRouterParam(event, 'id')
  const customers = await loadCustomers()
  // The whole slug, not a prefix or a substring of it (ADR-0006); a missing id matches none
  const customer = customers.find((candidate) => candidate.slug === id)
  if (customer === undefined) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  // The query of the list the detail was opened from: the same search, filters and order of the
  // list shape the context the answer carries around the customer (ADR-0004)
  return { customer, ...detailContext(customers, customer, parseListQuery(getQuery(event))) }
})
