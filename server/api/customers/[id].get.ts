import type { ICustomerDetailResponse } from '#shared/types/customer'
import { loadCustomers } from '../../utils/loadCustomers'

export default defineEventHandler(async (event): Promise<ICustomerDetailResponse> => {
  const id = getRouterParam(event, 'id')
  const customers = await loadCustomers()
  // The whole slug, not a prefix or a substring of it (ADR-0006); a missing id matches none
  const customer = customers.find((candidate) => candidate.slug === id)
  if (customer === undefined) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  return { customer }
})
