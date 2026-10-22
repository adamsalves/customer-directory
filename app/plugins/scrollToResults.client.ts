export default defineNuxtPlugin(() => {
  const router = useRouter()

  // The history listener hears popstate: back and forward, and also the browser's own navigation to
  // a fragment (the skip link). The flag only skips the afterEach that follows. All of them stay as
  // Nuxt has them, which leaves a query change where it is: restoring the saved position here
  // drifts, because the skeleton and the list swap right after and the shift moves the page again.
  // ponytail: a guard that throws on a pop skips afterEach and leaves the flag set, so the next
  // navigation would not scroll. No middleware exists yet. Upgrade: keep the destination of the pop
  // and compare it with to.fullPath, instead of a boolean.
  let popped = false
  router.options.history.listen(() => {
    popped = true
  })

  router.afterEach((to, from, failure) => {
    const wasPopped = popped
    popped = false
    // A navigation that was cancelled or aborted did not change the page: nothing to scroll to
    if (wasPopped || failure) return
    // A frame later, once Nuxt's own scroll handling has run (it can jump to the top when a hash goes)
    requestAnimationFrame(() => {
      scrollToResults(to, from)
    })
  })
})
