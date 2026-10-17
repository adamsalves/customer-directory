<script setup lang="ts">
import S from './default.module.scss'
</script>

<template>
  <div :class="S.Layout">
    <a href="#conteudo" :class="S.SkipLink" data-testid="layout__skip--link">
      Pular para o conteúdo
    </a>
    <AppHeader />
    <main id="conteudo" tabindex="-1" :class="S.Main" data-testid="layout__content--main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
