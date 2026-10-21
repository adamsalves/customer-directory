export default defineNuxtPlugin(() => {
  const router = useRouter()

  // A history listener only hears back and forward, which stay as Nuxt has them: it leaves a query
  // change where it is. Restoring the saved position here drifts, because the skeleton and the list
  // swap right after and the shift moves the page again.
  let popped = false
  router.options.history.listen(() => {
    popped = true
  })

  router.afterEach((to, from) => {
    const wasPopped = popped
    popped = false
    // A frame later, once Nuxt's own scroll handling has run (it can jump to the top when a hash goes)
    if (wasPopped) return
    requestAnimationFrame(() => {
      scrollToResults(to, from)
    })
  })
})
