import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppBreadcrumb, { type IBreadcrumbItem } from './AppBreadcrumb.vue'

const items: IBreadcrumbItem[] = [
  { label: 'Home', to: '/clientes' },
  { label: 'Usuários', to: '/clientes?pagina=2' },
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
      ['Home', '/clientes'],
      ['Usuários', '/clientes?pagina=2'],
    ])
  })

  it('marks only the last item as the current page', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, { props: { items } })
    const current = wrapper.findAll('[aria-current]')

    expect(current).toHaveLength(1)
    expect(current[0]?.text()).toBe('Detalhes')
    expect(current[0]?.attributes('aria-current')).toBe('page')
  })

  it('renders a separator before every item but the first, hidden from assistive technology', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, { props: { items } })
    const separators = wrapper.findAll('[data-testid="breadcrumb__separator--text"]')

    expect(separators).toHaveLength(2)
    for (const separator of separators) {
      expect(separator.text()).toBe('>')
      expect(separator.attributes('aria-hidden')).toBe('true')
    }
  })

  it('keeps a step without target as plain text', async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, {
      props: {
        items: [{ label: 'Home', to: '/clientes' }, { label: 'Sem link' }, { label: 'Fim' }],
      },
    })

    const middle = wrapper.findAll('li')[1]

    expect(middle?.find('a').exists()).toBe(false)
    expect(middle?.text()).toContain('Sem link')
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
