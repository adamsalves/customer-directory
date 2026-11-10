<script setup lang="ts">
import S from './default.module.scss'
</script>

<template>
  <div :class="S.Layout">
    <!-- A singleton on nuxtApp that announces the document title on every dom:rendered. The layout
         is rendered here and by error.vue (which replaces app.vue and asks for this layout), so one
         announcer survives the error page and announces entering and leaving it, with no mounting
         race (ADR-0024) -->
    <NuxtRouteAnnouncer />
    <a href="#conteudo" :class="S.SkipLink" data-testid="layout__skip--link">
      Pular para o conteúdo
    </a>
    <AppHeader />
    <main id="conteudo" tabindex="-1" :class="S.Main" data-testid="layout__content--main">
      <slot />
    </main>
    <AppFooter />
    <AppToast />
  </div>
</template>
