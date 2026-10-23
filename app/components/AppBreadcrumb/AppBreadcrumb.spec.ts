import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppBreadcrumb, { type IBreadcrumbItem } from './AppBreadcrumb.vue'

const items: IBreadcrumbItem[] = [
  { label: 'Home', to: '/customers' },
  { label: 'Clientes', to: '/customers?page=2' },
  { label: 'Detalhes' },
]

describe('AppBreadcrumb', () => {
  it('labels the navigation landmark', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, { props: { items } })

    expect(wrapper.get('[data-testid="breadcrumb__trail--nav"]').attributes('aria-label')).toBe(
      'Trilha de navegação',
    )
  })

  it('links every step but the last', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, { props: { items } })
    const links = wrapper.findAll('[data-testid="breadcrumb__item--link"]')

    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Home', '/customers'],
      ['Clientes', '/customers?page=2'],
    ])
  })

  // mountSuspended stubs RouterLink, so the active-link aria-current is covered in tests/e2e
  it('marks only the last item as the current page', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, { props: { items } })
    const current = wrapper.findAll('[aria-current]')

    expect(current).toHaveLength(1)
    expect(current[0]?.text()).toBe('Detalhes')
    expect(current[0]?.attributes('aria-current')).toBe('page')
  })

  it('renders a separator before every item but the first, hidden from assistive technology', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, { props: { items } })
    const steps = wrapper.findAll('[data-testid="breadcrumb__step--item"]')
    const separators = wrapper.findAll('[data-testid="breadcrumb__separator--text"]')

    expect(
      steps.map((step) => step.find('[data-testid="breadcrumb__separator--text"]').exists()),
    ).toEqual([false, true, true])
    for (const separator of separators) {
      expect(separator.text()).toBe('>')
      expect(separator.attributes('aria-hidden')).toBe('true')
    }
  })

  it('keeps a step without target as plain text', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, {
      props: {
        items: [{ label: 'Home', to: '/customers' }, { label: 'Sem link' }, { label: 'Fim' }],
      },
    })

    const middle = wrapper.findAll('[data-testid="breadcrumb__step--item"]')[1]

    expect(middle?.find('[data-testid="breadcrumb__item--link"]').exists()).toBe(false)
    expect(middle?.get('[data-testid="breadcrumb__item--text"]').text()).toBe('Sem link')
  })

  it('renders the last step as the current page even when it has a target', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, {
      props: {
        items: [
          { label: 'Home', to: '/customers' },
          { label: 'Fim', to: '/customers?page=2' },
        ],
      },
    })

    expect(wrapper.findAll('[data-testid="breadcrumb__item--link"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="breadcrumb__item--current"]').text()).toBe('Fim')
  })

  it('hides the trail on mobile only when asked to', async () => {
    const shown = await mountSuspended(AppBreadcrumb, { props: { items } })
    const hidden = await mountSuspended(AppBreadcrumb, { props: { items, hideOnMobile: true } })
    // CSS Modules hash the class names (_HideOnMobile_1a2b3c)
    const hasHideClass = (classes: string[]) =>
      classes.some((name) => name.includes('HideOnMobile'))

    expect(hasHideClass(shown.classes())).toBe(false)
    expect(hasHideClass(hidden.classes())).toBe(true)
  })
})
