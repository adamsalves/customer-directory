<script setup lang="ts">
const { theme, hasChoice } = useTheme()

// A null theme omits the attribute, and unhead leaves alone the one the inline script in <head>
// (themeScript.ts) set from the system preference; onMounted below adopts the same preference.
useHead({ htmlAttrs: { 'data-theme': theme } })

let systemTheme: MediaQueryList | undefined

function followSystemTheme(event: MediaQueryListEvent) {
  if (!hasChoice.value) theme.value = event.matches ? 'dark' : 'light'
}

// In onMounted, not in setup: the first client render must match the server HTML, where the
// theme is still null when there is no cookie. The inline script already put this same preference
// on <html> before the first paint, so adopting it here changes nothing on screen.
onMounted(() => {
  systemTheme = matchMedia('(prefers-color-scheme: dark)')
  if (theme.value === null) theme.value = systemTheme.matches ? 'dark' : 'light'
  systemTheme.addEventListener('change', followSystemTheme)
})

onBeforeUnmount(() => {
  systemTheme?.removeEventListener('change', followSystemTheme)
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
