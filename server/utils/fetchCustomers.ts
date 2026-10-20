import { normalizeCustomer } from './normalizeCustomer'
import { parseRawCustomers } from './parseRawCustomers'

// The validated, normalized list, cached for 1h with stale-while-revalidate (ADR-0005).
// No try/catch on purpose: a throw (S3 down, bad payload, no valid record) keeps the stale copy,
// while returning [] would overwrite it. parseRawCustomers throws instead of returning [].
// Callers pass the request event so the SWR refresh runs under event.waitUntil and is not cut off
// when a serverless function freezes after responding. The key ignores it: one list for everyone.
export const fetchCustomers = defineCachedFunction(
  async (_event: InstanceType<typeof H3Event>) => {
    // External data enters as unknown (ADR-0016): no type argument on $fetch
    const payload: unknown = await $fetch(useRuntimeConfig().customersUrl, { timeout: 10_000 })
    // An arrow, not `.map(normalizeCustomer)`: the index would land in its `now` parameter
    return parseRawCustomers(payload).map((raw) => normalizeCustomer(raw))
  },
  { name: 'customers', getKey: () => 'all', maxAge: 60 * 60, swr: true },
)
