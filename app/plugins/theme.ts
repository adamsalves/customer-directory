// A plugin, not app.vue: it applies to every page, error.vue included (the inline script in <head>
// already does). It lives as long as the app, so the listener below is never removed.
export default defineNuxtPlugin((nuxtApp) => {
  const { theme, hasChoice } = useTheme()

  // A null theme omits the attribute, and unhead leaves alone the one the inline script in <head>
  // (themeScript.ts) set from the system preference; the hook below adopts the same preference.
  useHead({ htmlAttrs: { 'data-theme': theme } })

  // After hydration (client only: the server never fires this hook), not in setup: the first client
  // render must match the server HTML, where the theme is still null when there is no cookie. Nor
  // in app:mounted, which comes as soon as mount() returns, before the async layout has hydrated:
  // the toggle in it would render the adopted theme against the server HTML. The inline script
  // already put this same preference on <html> before the first paint, so adopting it here changes
  // nothing on screen.
  nuxtApp.hook('app:suspense:resolve', () => {
    const systemTheme = matchMedia('(prefers-color-scheme: dark)')
    if (theme.value === null) theme.value = systemTheme.matches ? 'dark' : 'light'
    systemTheme.addEventListener('change', (event) => {
      if (!hasChoice.value) theme.value = event.matches ? 'dark' : 'light'
    })
  })
})
