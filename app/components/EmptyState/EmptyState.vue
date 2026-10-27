<script setup lang="ts">
import S from './EmptyState.module.scss'

const props = defineProps<{ search: string }>()

defineEmits<{ clear: [] }>()

// Only the search case so far: the filter cases come with the filters (#25)
const hint = computed(
  () =>
    `Não encontramos ninguém chamado “${props.search}”. Confira a grafia ou busque só pelo sobrenome.`,
)
</script>

<template>
  <div :class="S.EmptyState">
    <span aria-hidden="true" :class="S.Icon">
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <circle cx="10.5" cy="10.5" r="6.5"></circle>
        <path d="M15.5 15.5L20 20"></path>
      </svg>
    </span>
    <h2 :class="S.Title" data-testid="empty-state__title--heading">Nenhum cliente encontrado</h2>
    <p :class="S.Hint" data-testid="empty-state__hint--text">{{ hint }}</p>
    <button
      type="button"
      :class="S.Clear"
      data-testid="empty-state__clear--button"
      @click="$emit('clear')"
    >
      Limpar busca e filtros
    </button>
  </div>
</template>
