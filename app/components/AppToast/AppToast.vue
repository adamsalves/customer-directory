<script setup lang="ts">
import S from './AppToast.module.scss'

const { message } = useToast()
</script>

<template>
  <!-- Always in the HTML, empty: a screen reader announces what appears in a region it has already
       met, not a region that arrives with its text -->
  <div role="status" aria-live="polite" :class="S.Region" data-testid="toast__root--status">
    <span v-if="message" :class="S.Bubble" data-testid="toast__message--text">{{ message }}</span>
  </div>
</template>
