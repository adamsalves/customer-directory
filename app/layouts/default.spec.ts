import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import DefaultLayout from './default.vue'

const SKIP = '[data-testid="layout__skip--link"]'
const MAIN = '[data-testid="layout__content--main"]'

enableAutoUnmount(afterEach)

// The focus of one test must not leak into the next, and an error set for one must not be what the
// next one starts from
afterEach(async () => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  await clearError()
})

function htmlElement(element: Element): HTMLElement {
  if (!(element instanceof HTMLElement)) throw new Error('the element is not an HTML element')
  return element
}

// In the document, so the focus can move (focus needs an element that is connected)
async function mountOnSkipLink() {
  const wrapper = await mountSuspended(DefaultLayout, { attachTo: document.body })
  // A reader where the click starts: the skip link itself, the stop the Tab reaches first
  htmlElement(wrapper.get(SKIP).element).focus()
  return { skipLink: htmlElement(wrapper.get(SKIP).element), main: wrapper.get(MAIN).element }
}

describe('skip link', () => {
  // Without an error the click goes on as the fragment navigation it is, and the focus follows
  // whatever the browser makes of it — never a jump of ours to the main
  it('keeps the default of the click and the focus off the main when no error is set', async () => {
    const { skipLink, main } = await mountOnSkipLink()

    // The dispatch answers false iff the default was prevented
    expect(
      skipLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
    ).toBe(true)
    expect(document.activeElement).not.toBe(main)
  })

  // With an error the click must not navigate: the afterEach of the router clears the error when a
  // navigation lands, and the customer page would refetch its customer to 404 again. The focus goes
  // to the main, what the fragment navigation itself would do (ADR-0024)
  it('prevents the navigation, focuses the main and keeps the error when one is set', async () => {
    const { skipLink, main } = await mountOnSkipLink()
    useError().value = createError({ statusCode: 404, statusMessage: 'Not Found' })

    // The dispatch answers false iff the default was prevented
    expect(
      skipLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
    ).toBe(false)
    await expect.poll(() => document.activeElement).toBe(main)
    expect(useError().value).toMatchObject({ status: 404 })
  })
})
