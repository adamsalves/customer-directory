import { parseListQuery } from '#shared/utils/listQuery'
import { fetchCustomers } from '../utils/fetchCustomers'
import { queryCustomers } from '../utils/queryCustomers'

export default defineEventHandler(async (event) => {
  // The 502 is made here, not in fetchCustomers: there the throw is what keeps the stale copy under
  // swr (ADR-0005), so an error only gets here when there is no copy to serve. Nitro does not log a
  // handled 5xx (only unhandled and fatal errors), so the cause is logged here.
  const customers = await fetchCustomers().catch((cause: unknown) => {
    console.error('[customers] source failed', cause)
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', cause })
  })
  return queryCustomers(customers, parseListQuery(getQuery(event)))
})
