import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorPage from './error.vue'

const ALERT = '[data-testid="error-page__message--alert"]'
const TITLE = '[data-testid="error-page__title--heading"]'
const TEXT = '[data-testid="error-page__text--paragraph"]'
const LINK = '[data-testid="error-page__list--link"]'
const MAIN = '[data-testid="layout__content--main"]'
const TOGGLE = '[data-testid="header__theme--toggle"]'
const TOAST = '[data-testid="toast__root--status"]'

const NOT_FOUND = {
  heading: 'Cliente não encontrado',
  text: 'O link pode estar desatualizado ou o cliente não existe mais.',
}
const GENERIC = {
  heading: 'Algo deu errado',
  text: 'Não foi possível abrir esta página. Tente novamente em instantes.',
}

enableAutoUnmount(afterEach)

// The focus of one test must not leak into the next
afterEach(() => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
})

// Nuxt hands the page the error with its status: the one the BFF gave, or the router's 404
function mountError(status: number) {
  return mountSuspended(ErrorPage, { props: { error: createError({ status }) } })
}

// In the document, so the title can take the focus (focus needs an element that is connected)
function mountAttached(status: number) {
  return mountSuspended(ErrorPage, {
    props: { error: createError({ status }) },
    attachTo: document.body,
  })
}

function htmlElement(element: Element): HTMLElement {
  if (!(element instanceof HTMLElement)) throw new Error('the element is not an HTML element')
  return element
}

describe('error page', () => {
  // Only the 404 is a link gone stale: the 4xx that come before it and the 5xx after it are not
  it.each([
    { status: 404, ...NOT_FOUND },
    { status: 400, ...GENERIC },
    { status: 500, ...GENERIC },
    { status: 502, ...GENERIC },
  ])('says "$heading" for a $status', async ({ status, heading, text }) => {
    const wrapper = await mountError(status)

    expect(wrapper.get(TITLE).text()).toBe(heading)
    expect(wrapper.get(TEXT).text()).toBe(text)
    // What a screen reader reads on a page load, where the alert in the HTML is not announced
    await vi.waitFor(() => {
      expect(document.title).toBe(`${heading} · Juntos Somos Mais`)
    })
  })

  it('has one heading, the h1', async () => {
    const wrapper = await mountError(404)

    expect(wrapper.get(TITLE).element.tagName).toBe('H1')
    expect(wrapper.findAll('h1')).toHaveLength(1)
  })

  // Inside the alert, the label of the link would be read as part of the message
  it('announces the message as an alert, with the link outside it', async () => {
    const wrapper = await mountError(404)
    const alert = wrapper.get(ALERT)

    expect(alert.attributes('role')).toBe('alert')
    expect(alert.find(TITLE).exists()).toBe(true)
    expect(alert.find(TEXT).exists()).toBe(true)
    expect(alert.find(LINK).exists()).toBe(false)
  })

  // The same link for any error: the list, not the history
  it.each([404, 500])('links a %i back to the list', async (status) => {
    const link = (await mountError(status)).get(LINK)

    expect(link.text()).toBe('Ver lista de clientes')
    expect(link.attributes('href')).toBe('/customers')
  })

  // error.vue replaces app.vue, so the layout has to be asked for: it is what brings the header, the
  // toggle the theme goes on through, and the toast
  it('shows the error inside the layout, with the header, the theme toggle and the toast', async () => {
    const wrapper = await mountError(404)

    expect(wrapper.get(MAIN).find(ALERT).exists()).toBe(true)
    expect(wrapper.find(TOGGLE).exists()).toBe(true)
    expect(wrapper.find(TOAST).exists()).toBe(true)
  })

  // The page replaces the current view in the middle of an SPA navigation, and the focus falls to
  // <body> (a direct URL access starts there too): on mount the title takes it, an entry point for
  // the keyboard and the screen reader (ADR-0024). tabindex="-1" keeps it out of the tab order
  it.each([404, 500])('a %i takes the focus to the title on mount', async (status) => {
    const wrapper = await mountAttached(status)
    const title = htmlElement(wrapper.get(TITLE).element)

    // The attribute, not the tabIndex property: an h1 without it reads -1 from the property too
    expect(title.getAttribute('tabindex')).toBe('-1')
    // The focus lands a frame after the mount
    await expect.poll(() => document.activeElement).toBe(title)
  })
})
