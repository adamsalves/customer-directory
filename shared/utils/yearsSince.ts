// Full years from an ISO date to `now`, on UTC dates: the source dates are UTC, so the count does
// not depend on the zone of the server or of the browser.
export function yearsSince(iso: string, now: Date): number {
  const date = new Date(iso)
  const years = now.getUTCFullYear() - date.getUTCFullYear()
  const months = now.getUTCMonth() - date.getUTCMonth()
  const birthdayPending = months < 0 || (months === 0 && now.getUTCDate() < date.getUTCDate())
  return birthdayPending ? years - 1 : years
}
