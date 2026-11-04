import { fetchCustomers } from './fetchCustomers'
import { isSourceFailure } from './sourceFailure'

// The list for every handler that reads it, with the 502 for a source that failed. The 502 is made
// in this function and not in fetchCustomers: inside the cached function the throw is what keeps
// the stale copy under swr (ADR-0005), so an error only reaches the catch below when there is no
// copy to serve. Only a failure of the source is a bad gateway; a bug of ours goes on as a 500,
// which Nitro logs itself. Nitro does not log a handled 5xx, so the catch logs the cause of the 502.
export function loadCustomers() {
  return fetchCustomers().catch((cause: unknown) => {
    if (!isSourceFailure(cause)) throw cause
    console.error('[loadCustomers] source failed', cause)
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', cause })
  })
}
