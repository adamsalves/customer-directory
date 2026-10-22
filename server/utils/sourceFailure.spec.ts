import { describe, expect, it } from 'vitest'
import { InvalidPayloadError, isSourceFailure } from './sourceFailure'

function namedError(name: string): Error {
  const error = new Error('failed')
  error.name = name
  return error
}

describe('isSourceFailure', () => {
  it.each([
    { name: 'a failed request (FetchError)', cause: namedError('FetchError') },
    { name: 'a payload that is not the list', cause: new InvalidPayloadError('invalid') },
  ])('is true for $name', ({ cause }) => {
    expect(isSourceFailure(cause)).toBe(true)
  })

  // A bug of ours stays a 500: it is no bad gateway
  it.each([
    { name: 'a TypeError', cause: new TypeError('x is undefined') },
    { name: 'a plain Error', cause: new Error('failed') },
    { name: 'something that is not an Error', cause: { name: 'FetchError' } },
  ])('is false for $name', ({ cause }) => {
    expect(isSourceFailure(cause)).toBe(false)
  })
})
