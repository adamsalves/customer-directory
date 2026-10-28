<script setup lang="ts">
import { MAX_SEARCH_LENGTH } from '#shared/utils/listQuery'
import S from './SearchField.module.scss'

// The wait after the last key before the search reaches the URL: each write asks the BFF again
// (ADR-0013)
const DEBOUNCE_MS = 300

// Where a "/" is a character the reader is typing: every input but the ones with no text to type
const TYPING =
  'textarea,select,input:not([type=checkbox],[type=radio],[type=range],[type=button],[type=submit],[type=reset],[type=color],[type=file],[type=image])'

const route = useRoute()
const { query, pending, setQuery } = useListQuery()
const inputId = useId()
const inputRef = useTemplateRef('input')

// What the field shows. The URL gets it trimmed and the field keeps what was typed, so "ana " stays
const draft = ref(query.value.search)
let timer: ReturnType<typeof setTimeout> | undefined
// The search this field wrote, until it comes back through the route or its write fails. The write
// in flight (useListQuery) says what is on its way, not who wrote it, and the watcher below has to
// tell this field's write from another one that arrives with the same search (ADR-0023).
let written: string | undefined

function cancel() {
  clearTimeout(timer)
  timer = undefined
}

// Another search starts over from page 1 and keeps the rest of the list state, a write on its way
// included (useListQuery); the same search keeps its page. On the list the write replaces the
// history entry, so back does not walk through every term; from another page it adds one, so back
// returns there. A write that says nothing new is not sent: an empty search off the list (the reader
// stays where they are), the search that is already on its way, and, on the list, the one the list
// state already has (the results scroll would take it for a page change and move the focus off the
// field) (ADR-0013).
function commit() {
  cancel()
  const search = draft.value.trim()
  const onList = route.path === LIST_PATH
  const inFlight = pending()
  const base = inFlight ?? query.value
  if ((!onList && search === '') || search === inFlight?.search) return
  const same = search === base.search
  if (onList && same) return
  written = search
  void setQuery({ search, page: same ? base.page : 1 }, { replace: onList }).then((failure) => {
    // A write that failed brings nothing back, unless the write that cancelled it carries its search
    if (failure && pending()?.search !== written) written = undefined
  })
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

// Escape only acts on text: with the field empty it stays free for whatever else listens for it. It
// also ends a composition (an IME, a dead key), which is not the field's to clear.
function onEscape(event: KeyboardEvent) {
  if (event.isComposing || draft.value === '') return
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

// Back, forward, a link or a clear button moved the search: the field follows it. Its own write
// coming back is not that: the draft is ahead of it by the keys typed meanwhile, and so is the wait
// they started, still running. The mark tells it from a clear button's write, which arrives with the
// same search (an empty one) and has no keys behind it. The trimmed draft coming back stays as typed.
// Any arrival puts the mark away: it was that write, or something else brought another search. A
// write that lands without changing the search never arrives, and the next change of it clears the
// mark.
watch(
  () => query.value.search,
  (search) => {
    const own = search === written
    written = undefined
    if (own || search === draft.value.trim()) return
    cancel()
    draft.value = search
  },
)

// The wait does not follow the reader out of the list: it would take them back. It does not stop on
// the way in either, which is the field's own write landing, and the keys typed meanwhile still go.
watch(
  () => route.path,
  (path) => {
    if (path !== LIST_PATH) cancel()
  },
)

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.matches(TYPING) || target.isContentEditable)
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
    <label :for="inputId" class="VisuallyHidden">Buscar clientes por nome ou sobrenome</label>
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
      aria-keyshortcuts="/"
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
