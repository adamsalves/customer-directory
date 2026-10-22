import { parseListQuery } from '#shared/utils/listQuery'
import { fetchCustomers } from '../utils/fetchCustomers'
import { queryCustomers } from '../utils/queryCustomers'
import { isSourceFailure } from '../utils/sourceFailure'

export default defineEventHandler(async (event) => {
  // The 502 is made here, not in fetchCustomers: there the throw is what keeps the stale copy under
  // swr (ADR-0005), so an error only gets here when there is no copy to serve. Only a failure of the
  // source is a bad gateway; a bug of ours goes on as a 500, which Nitro logs itself. It does not
  // log a handled 5xx, so the cause of the 502 is logged here.
  const customers = await fetchCustomers().catch((cause: unknown) => {
    if (!isSourceFailure(cause)) throw cause
    console.error('[customers] source failed', cause)
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', cause })
  })
  return queryCustomers(customers, parseListQuery(getQuery(event)))
})
