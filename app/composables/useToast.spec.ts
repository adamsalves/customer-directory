import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  // useState keeps the message for the whole file
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    clearNuxtState('toast')
  })

  it('starts with no message', () => {
    expect(useToast().message.value).toBe('')
  })

  it('shows the message at once, to every caller', () => {
    useToast().show('E-mail copiado')

    expect(useToast().message.value).toBe('E-mail copiado')
  })

  it('takes the message down at 2200 ms, not before', () => {
    const { message, show } = useToast()
    show('E-mail copiado')

    vi.advanceTimersByTime(2199)
    expect(message.value).toBe('E-mail copiado')

    vi.advanceTimersByTime(1)
    expect(message.value).toBe('')
  })

  // The first message would have expired at 2200 ms: the second one has a wait of its own
  it('replaces the message and starts the wait over', () => {
    const { message, show } = useToast()
    show('E-mail copiado')
    vi.advanceTimersByTime(2000)

    show('Não foi possível copiar')
    expect(message.value).toBe('Não foi possível copiar')

    vi.advanceTimersByTime(200)
    expect(message.value).toBe('Não foi possível copiar')

    vi.advanceTimersByTime(1999)
    expect(message.value).toBe('Não foi possível copiar')

    vi.advanceTimersByTime(1)
    expect(message.value).toBe('')
  })

  // Vue warns about a write to a read-only ref in development: the spy keeps that out of the output
  it('hands the message out read-only', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { message } = useToast()

    Reflect.set(message, 'value', 'sem prazo')

    expect(message.value).toBe('')
    expect(warn).toHaveBeenCalledOnce()
  })
})
