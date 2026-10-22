// The payload came, but it is not the list of customers
export class InvalidPayloadError extends Error {
  override name = 'InvalidPayloadError'
}

// What the source got wrong, as opposed to a bug of ours: the request failed (a status, the network
// or the timeout, all of them wrapped by ofetch in a FetchError) or the payload is not the list.
// By name and not instanceof: ofetch is no dependency of this repo.
export function isSourceFailure(cause: unknown): boolean {
  return (
    cause instanceof InvalidPayloadError || (cause instanceof Error && cause.name === 'FetchError')
  )
}
