<script setup lang="ts">
import { MAX_SEARCH_LENGTH, sameListState } from '#shared/utils/listQuery'
import S from './SearchField.module.scss'

// The wait after the last key before the search reaches the URL: each write asks the BFF again
// (ADR-0013)
const DEBOUNCE_MS = 300

const route = useRoute()
const { query, setQuery } = useListQuery()
const inputId = useId()
const inputRef = useTemplateRef('input')

// What the field shows. The URL gets it trimmed and the field keeps what was typed, so "ana " stays
const draft = ref(query.value.search)
let timer: ReturnType<typeof setTimeout> | undefined

function cancel() {
  clearTimeout(timer)
}

// Another search starts over from page 1 and keeps the rest of the list state; the same search keeps
// its page. On the list it replaces the history entry, so back does not walk through every term,
// and a write that changes nothing is skipped: the results scroll would take it for a page change
// and move the focus off the field. From another page it adds an entry, so back returns there, and
// it goes to the list even for the same search (ADR-0013).
function commit() {
  cancel()
  const search = draft.value.trim()
  const next = {
    ...query.value,
    search,
    page: search === query.value.search ? query.value.page : 1,
  }
  const onList = route.path === LIST_PATH
  if (onList && sameListState(next, query.value)) return
  void setQuery(next, { replace: onList })
}

function clear() {
  draft.value = ''
  commit()
}

// The wait restarts on every key. Only the reader's typing gets here, so a draft the field
// rewrites itself (below) never turns into a write.
function onInput() {
  cancel()
  timer = setTimeout(commit, DEBOUNCE_MS)
}

// Escape only acts on text: with the field empty it stays free for whatever else listens for it
function onEscape(event: KeyboardEvent) {
  if (draft.value === '') return
  event.preventDefault()
  clear()
}

function focusField() {
  const field = inputRef.value
  if (field instanceof HTMLInputElement) field.focus()
}

// The button goes away with the text, and the focus it holds would fall to the page
function onClear() {
  clear()
  focusField()
}

// Back, forward or a link moved the search: the field follows it. The trimmed draft coming back is
// the field's own write, and the draft stays as typed.
watch(
  () => query.value.search,
  (search) => {
    if (search === draft.value.trim()) return
    cancel()
    draft.value = search
  },
)

// Where a "/" is a character the reader is typing
function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.matches('input, textarea, select') || target.isContentEditable)
  )
}

// "/" focuses the field from anywhere on the page but a field that takes text (as in the prototype)
function focusOnSlash(event: KeyboardEvent) {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  if (isTyping(event.target)) return
  event.preventDefault()
  focusField()
}

onMounted(() => {
  window.addEventListener('keydown', focusOnSlash)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', focusOnSlash)
  cancel()
})
</script>

<template>
  <form role="search" :class="S.Search" data-testid="header__search--form" @submit.prevent="commit">
    <label :for="inputId" :class="S.VisuallyHidden">Buscar clientes por nome ou sobrenome</label>
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      :class="S.Icon"
    >
      <circle cx="10.5" cy="10.5" r="6.5"></circle>
      <path d="M15.5 15.5L20 20"></path>
    </svg>
    <input
      :id="inputId"
      ref="input"
      v-model="draft"
      type="text"
      inputmode="search"
      enterkeyhint="search"
      autocomplete="off"
      spellcheck="false"
      placeholder="Buscar aqui"
      :maxlength="MAX_SEARCH_LENGTH"
      :class="S.Input"
      data-testid="header__search--input"
      @input="onInput"
      @keydown.esc="onEscape"
    />
    <button
      v-if="draft !== ''"
      type="button"
      aria-label="Limpar busca"
      :class="S.Clear"
      data-testid="header__search--clear"
      @click="onClear"
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
      >
        <path d="M6 6l12 12M18 6L6 18"></path>
      </svg>
    </button>
    <!-- In the HTML for any width: CSS shows it from 960px (ADR-0014) -->
    <kbd
      v-else
      aria-hidden="true"
      title="Atalho: pressione / para buscar"
      :class="S.Hint"
      data-testid="header__search--hint"
    >
      /
    </kbd>
  </form>
</template>
