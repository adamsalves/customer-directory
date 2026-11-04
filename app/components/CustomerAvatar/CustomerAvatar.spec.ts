import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CustomerAvatar from './CustomerAvatar.vue'

const PHOTO = '[data-testid="customer-avatar__photo--image"]'
const INITIALS = '[data-testid="customer-avatar__initials--text"]'

const props = {
  src: 'https://randomuser.me/api/portraits/women/18.jpg',
  name: 'Eleutério Almeida',
  alt: '',
  size: 80,
}

// happy-dom loads no image: it reports every one complete with no width, which is how a browser
// reports a broken one. A spec that wants the photo to stay says what a browser would.
function stubImage({ complete, width }: { complete: boolean; width: number }) {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(complete)
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(width)
}

const photoLoaded = () => {
  stubImage({ complete: true, width: 80 })
}

describe('CustomerAvatar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the photo with its alt text, its size reserved and decoding off the main thread', async () => {
    photoLoaded()
    const wrapper = await mountSuspended(CustomerAvatar, {
      props: { ...props, alt: 'Foto de Eleutério Almeida', size: 48 },
    })

    expect(wrapper.get(PHOTO).attributes()).toMatchObject({
      src: props.src,
      alt: 'Foto de Eleutério Almeida',
      width: '48',
      height: '48',
      decoding: 'async',
    })
  })

  it('loads the photo lazily and without priority by default', async () => {
    photoLoaded()
    const photo = (await mountSuspended(CustomerAvatar, { props })).get(PHOTO)

    expect(photo.attributes('loading')).toBe('lazy')
    expect(photo.attributes('fetchpriority')).toBeUndefined()
  })

  it('loads the photo eagerly and with high priority when asked to', async () => {
    photoLoaded()
    const photo = (
      await mountSuspended(CustomerAvatar, {
        props: { ...props, loading: 'eager', fetchpriority: 'high' },
      })
    ).get(PHOTO)

    expect(photo.attributes('loading')).toBe('eager')
    expect(photo.attributes('fetchpriority')).toBe('high')
  })

  it('shows the photo and no initials while the photo is there', async () => {
    photoLoaded()
    const wrapper = await mountSuspended(CustomerAvatar, { props })

    expect(wrapper.find(PHOTO).exists()).toBe(true)
    expect(wrapper.find(INITIALS).exists()).toBe(false)
  })

  it('swaps the photo for the initials when the photo fails to load', async () => {
    photoLoaded()
    const wrapper = await mountSuspended(CustomerAvatar, { props })

    await wrapper.get(PHOTO).trigger('error')

    expect(wrapper.find(PHOTO).exists()).toBe(false)
    expect(wrapper.get(INITIALS).text()).toBe('EA')
  })

  // The browser fires the error while the page is still plain HTML, before the listener is on the
  // image; what is left to see is an image that is complete with no width
  it('swaps the photo for the initials when it failed before the page hydrated', async () => {
    stubImage({ complete: true, width: 0 })
    const wrapper = await mountSuspended(CustomerAvatar, { props })

    expect(wrapper.find(PHOTO).exists()).toBe(false)
    expect(wrapper.get(INITIALS).text()).toBe('EA')
  })

  // No width yet is no failure: the photo is on its way, not complete
  it('keeps the photo while it is still loading', async () => {
    stubImage({ complete: false, width: 0 })
    const wrapper = await mountSuspended(CustomerAvatar, { props })

    expect(wrapper.find(PHOTO).exists()).toBe(true)
    expect(wrapper.find(INITIALS).exists()).toBe(false)
  })

  // The first letter of the first and of the last word; the rest of the name does not count
  it.each([
    { name: 'two words', text: 'Eleutério Almeida', initials: 'EA' },
    { name: 'three words', text: 'Maria da Cruz', initials: 'MC' },
    { name: 'one word', text: 'Madonna', initials: 'M' },
    { name: 'lowercase words', text: 'érica álvares', initials: 'ÉÁ' },
    { name: 'spaces around and between the words', text: '  ana   lima  ', initials: 'AL' },
    { name: 'words split by a non-breaking space', text: 'ana\u00a0lima', initials: 'AL' },
    { name: 'no name', text: '', initials: '' },
  ])('takes the initials from $name', async ({ text, initials }) => {
    photoLoaded()
    const wrapper = await mountSuspended(CustomerAvatar, { props: { ...props, name: text } })

    await wrapper.get(PHOTO).trigger('error')

    expect(wrapper.get(INITIALS).text()).toBe(initials)
  })

  // CSS Modules hash the class names (_Initials_1a2b3c) and happy-dom applies no CSS: what can be
  // seen here is that each part carries the class its rule is written for
  it('gives the root, the photo and the initials the classes of the stylesheet', async () => {
    photoLoaded()
    const wrapper = await mountSuspended(CustomerAvatar, { props })

    expect(wrapper.classes()).toEqual([expect.stringContaining('Avatar')])
    expect(wrapper.get(PHOTO).classes()).toEqual([expect.stringContaining('Image')])
    await wrapper.get(PHOTO).trigger('error')
    expect(wrapper.get(INITIALS).classes()).toEqual([expect.stringContaining('Initials')])
  })

  it('hides the initials from assistive technology', async () => {
    photoLoaded()
    const wrapper = await mountSuspended(CustomerAvatar, { props })

    await wrapper.get(PHOTO).trigger('error')

    expect(wrapper.get(INITIALS).attributes('aria-hidden')).toBe('true')
  })
})
