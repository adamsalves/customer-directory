import { normalizeCustomer } from './normalizeCustomer'
import { parseRawCustomers } from './parseRawCustomers'

// The validated, normalized list, cached for 1h with stale-while-revalidate (ADR-0005).
// No try/catch on purpose: a throw (S3 down, bad payload, no valid record) keeps the stale copy,
// while returning [] would overwrite it. parseRawCustomers throws instead of returning [].
// No arguments, so one cache entry serves every query; an argument such as the event would
// split it per URL, and with swr those entries never expire (Nitro 2.13).
export const fetchCustomers = defineCachedFunction(
  async () => {
    // External data enters as unknown (ADR-0016): no type argument on $fetch
    const payload: unknown = await $fetch(useRuntimeConfig().customersUrl, { timeout: 10_000 })
    // An arrow, not `.map(normalizeCustomer)`: the index would land in its `now` parameter
    return parseRawCustomers(payload).map((raw) => normalizeCustomer(raw))
  },
  // Bump `integrity` when the shape of ICustomer changes: the entry on disk (dev) outlives a
  // restart, and Nitro would serve the old shape for up to 1h (2: `stateSlug`, #23)
  { name: 'customers', maxAge: 60 * 60, swr: true, integrity: 'customer-2' },
)
