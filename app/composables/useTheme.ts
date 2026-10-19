type TTheme = 'light' | 'dark'

export function isTheme(value: unknown): value is TTheme {
  return value === 'light' || value === 'dark'
}

// ADR-0011: the cookie holds the explicit choice. The server reads it and renders <html data-theme>.
export function useTheme() {
  // The cookie is client-controlled input: it stays `unknown` until isTheme says otherwise. The
  // default decode (decodeURIComponent) is skipped because a value like `dark%` makes it throw a
  // URIError, which would turn every server render into a 500. We only ever write plain words.
  const cookie = useCookie<unknown>('jsm-theme', {
    maxAge: 60 * 60 * 24 * 365, // one year, in seconds
    sameSite: 'lax',
    decode: (value) => value,
  })
  // null means "no explicit choice": the system preference applies.
  const theme = useState<TTheme | null>('theme', () =>
    isTheme(cookie.value) ? cookie.value : null,
  )
  // Shared state, not a computed over `cookie`: every useCookie call keeps its own ref and only
  // hears about the others' writes asynchronously, so a click would not reach app.vue at once.
  const hasChoice = useState('theme-chosen', () => isTheme(cookie.value))

  function setTheme(next: TTheme) {
    theme.value = next
    hasChoice.value = true
    cookie.value = next
  }

  return { theme, hasChoice, setTheme }
}
