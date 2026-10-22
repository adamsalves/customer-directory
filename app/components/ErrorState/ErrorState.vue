<script setup lang="ts">
import S from './ErrorState.module.scss'

defineEmits<{ retry: [] }>()

// A screen reader does not announce an alert that is already in the HTML of a page load, but it
// reads the title. Gone with the component.
useHead({ titleTemplate: (title) => `Erro: ${title ?? ''}` })
</script>

<template>
  <div :class="S.ErrorState">
    <!-- The alert is the message only: the button is no part of what is announced -->
    <div role="alert" :class="S.Message" data-testid="error-state__message--alert">
      <h2 :class="S.Title">Não foi possível carregar os clientes</h2>
      <p :class="S.Text">Verifique sua conexão e tente novamente. Seus filtros serão mantidos.</p>
    </div>
    <button
      type="button"
      :class="S.Retry"
      data-testid="error-state__retry--button"
      @click="$emit('retry')"
    >
      Tentar novamente
    </button>
  </div>
</template>
