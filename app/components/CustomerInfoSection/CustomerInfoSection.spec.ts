import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import CustomerInfoSection from './CustomerInfoSection.vue'

const ROOT = '[data-testid="customer-info-section__root--section"]'
const HEADING = '[data-testid="customer-info-section__heading--heading"]'
const LIST = '[data-testid="customer-info-section__list--list"]'

const mountSection = () =>
  mountSuspended(CustomerInfoSection, {
    props: { heading: 'Contato', id: 'sec-contact' },
    slots: { default: '<div><dt>E-mail</dt><dd>a@example.com</dd></div>' },
  })

describe('CustomerInfoSection', () => {
  it('is a section named by its heading', async () => {
    const wrapper = await mountSection()
    const heading = wrapper.get(HEADING)

    expect(wrapper.get(ROOT).element.tagName).toBe('SECTION')
    expect(heading.element.tagName).toBe('H2')
    expect(heading.text()).toBe('Contato')
    expect(heading.attributes('id')).toBe('sec-contact')
    expect(wrapper.get(ROOT).attributes('aria-labelledby')).toBe('sec-contact')
  })

  // The id is the heading's: on the root too it would be in the page twice
  it('puts the id on the heading and not on the root', async () => {
    expect((await mountSection()).get(ROOT).attributes('id')).toBeUndefined()
  })

  it('puts the pairs of the slot in a description list', async () => {
    const list = (await mountSection()).get(LIST)

    expect(list.element.tagName).toBe('DL')
    expect(list.get('div > dt').text()).toBe('E-mail')
    expect(list.get('div > dd').text()).toBe('a@example.com')
  })

  // CSS Modules hash the class names (_Section_1a2b3c) and happy-dom applies no CSS: a binding lost
  // or misspelled would leave the section unstyled, and nothing else here would notice
  it('carries the classes of its stylesheet', async () => {
    const wrapper = await mountSection()
    const classes = [ROOT, HEADING, LIST].map((selector) => wrapper.get(selector).classes())

    expect(classes).toEqual([
      [expect.stringMatching(/^_Section_/)],
      [expect.stringMatching(/^_Heading_/)],
      [expect.stringMatching(/^_List_/)],
    ])
  })
})
