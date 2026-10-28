<script setup lang="ts">
import S from './EmptyState.module.scss'

// `filtered` is a state or a gender picked: the search is not one, it has hints of its own
const props = defineProps<{ search: string; filtered: boolean }>()

defineEmits<{ clear: [] }>()

// The hint blames what narrowed the list: the search, the filters or both (the prototype's). With no
// search only the filters can empty it: an empty source is an error, never an empty state.
const hint = computed(() => {
  if (props.search === '') return 'Nenhum cliente corresponde aos filtros selecionados.'
  return props.filtered
    ? 'Nenhum resultado para essa busca com os filtros atuais. Tente outro nome ou remova alguns filtros.'
    : `Não encontramos ninguém chamado “${props.search}”. Confira a grafia ou busque só pelo sobrenome.`
})
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
