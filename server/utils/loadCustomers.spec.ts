// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ICustomer } from '#shared/types/customer'
import { loadCustomers } from './loadCustomers'
import { InvalidPayloadError } from './sourceFailure'

// fetchCustomers is a cached function of Nitro and createError one of its globals, and neither
// exists outside the server (the API spec reaches them through the built one). A source that fails
// is easy there; a failure that is not the source's is not, and this is the only place for it.
const { fetchCustomers } = vi.hoisted(() => ({
  fetchCustomers: vi.fn<() => Promise<ICustomer[]>>(),
}))
vi.mock('./fetchCustomers', () => ({ fetchCustomers }))
vi.stubGlobal('createError', (input: object) => Object.assign(new Error('created'), input))

function silenceError() {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('loadCustomers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('turns a failure of the source into a 502 and logs its cause', async () => {
    const cause = new InvalidPayloadError('invalid')
    fetchCustomers.mockRejectedValue(cause)
    const error = silenceError()

    await expect(loadCustomers()).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      cause,
    })
    expect(error).toHaveBeenCalledWith('[loadCustomers] source failed', cause)
  })

  // A bug of ours is no bad gateway: it goes on as it is, a 500 that Nitro logs itself
  it('lets any other error go on as it is, without logging it', async () => {
    const bug = new TypeError('x is undefined')
    fetchCustomers.mockRejectedValue(bug)
    const error = silenceError()

    await expect(loadCustomers()).rejects.toBe(bug)
    expect(error).not.toHaveBeenCalled()
  })
})
