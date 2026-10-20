import type { IRawCustomer } from '#shared/types/customer'
import { isRecord } from '#shared/utils/isRecord'

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

// Checks only what the app reads (ADR-0016); extra fields of the source pass through unchecked.
export function isRawCustomer(value: unknown): value is IRawCustomer {
  if (!isRecord(value)) return false
  const { name, location, dob, registered, picture } = value
  if (
    !isRecord(name) ||
    !isRecord(location) ||
    !isRecord(dob) ||
    !isRecord(registered) ||
    !isRecord(picture)
  ) {
    return false
  }
  const { timezone } = location
  if (!isRecord(timezone)) return false
  return (
    (value.gender === 'male' || value.gender === 'female') &&
    (name.title === 'mr' || name.title === 'mrs' || name.title === 'ms' || name.title === 'miss') &&
    typeof name.first === 'string' &&
    typeof name.last === 'string' &&
    typeof location.street === 'string' &&
    typeof location.city === 'string' &&
    typeof location.state === 'string' &&
    Number.isInteger(location.postcode) &&
    typeof timezone.offset === 'string' &&
    typeof timezone.description === 'string' &&
    typeof value.email === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.cell === 'string' &&
    isDateString(dob.date) &&
    isDateString(registered.date) &&
    typeof picture.large === 'string'
  )
}

// A payload that is not { results: [] } throws; a single invalid record is dropped and logged.
// If no record survives (an empty source included) it throws too: returning [] would overwrite
// the cached list for an hour (ADR-0005).
export function parseRawCustomers(payload: unknown): IRawCustomer[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new Error('Invalid customers payload: expected { results: [] }')
  }
  const customers = payload.results.flatMap((item: unknown, index) => {
    if (isRawCustomer(item)) return [item]
    console.warn(`[parseRawCustomers] dropped invalid record at index ${String(index)}`)
    return []
  })
  if (customers.length === 0) {
    throw new Error('Invalid customers payload: no valid record')
  }
  return customers
}
