<script setup lang="ts">
import S from './default.module.scss'

const error = useError()

// useTemplateRef does not resolve its type where the element wraps a slot: an explicitly typed ref
// keeps it honest
const mainRef = ref<HTMLElement | null>(null)

// The click of the skip link is a fragment navigation, and the afterEach built into the router of
// Nuxt clears the error whenever a navigation lands with one set: the customer page would re-run,
// refetch the customer and 404 again. With an error, the click is prevented and the main takes the
// focus directly — what the navigation itself would do; without one, the navigation goes on
function onSkipClick(event: MouseEvent) {
  if (!error.value) return
  event.preventDefault()
  mainRef.value?.focus()
}
</script>

<template>
  <div :class="S.Layout">
    <!-- A singleton on nuxtApp that announces the document title on every dom:rendered. The layout
         is rendered here and by error.vue (which replaces app.vue and asks for this layout), so one
         announcer survives the error page and announces entering and leaving it, with no mounting
         race (ADR-0024) -->
    <NuxtRouteAnnouncer />
    <a href="#conteudo" :class="S.SkipLink" data-testid="layout__skip--link" @click="onSkipClick">
      Pular para o conteúdo
    </a>
    <AppHeader />
    <main
      id="conteudo"
      ref="mainRef"
      tabindex="-1"
      :class="S.Main"
      data-testid="layout__content--main"
    >
      <slot />
    </main>
    <AppFooter />
    <AppToast />
  </div>
</template>
