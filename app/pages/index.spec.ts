import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import IndexPage from './index.vue'

describe('index page', () => {
  it('renders the directory title', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.find('h1').text()).toBe('Diretório de membros')
  })
})
