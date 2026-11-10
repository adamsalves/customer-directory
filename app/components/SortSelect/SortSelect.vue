<script setup lang="ts">
import { SORT_OPTIONS, parseListQuery, type IListQuery } from '#shared/utils/listQuery'
import S from './SortSelect.module.scss'

type TVariant = 'card' | 'bar'

// One control in two places, both in the HTML at any width and shown one at a time by CSS (ADR-0014):
// `bar` is the pill in the bar of the sheet, below 960px, and `card` the select in the card of the
// toolbar, from 960px. They differ in their caption and their looks, not in what they do.
defineProps<{ variant: TVariant }>()

const CAPTIONS = { card: 'Ordenar por:', bar: 'Ordenar:' } as const satisfies Record<
  TVariant,
  string
>

// In the order of SORT_OPTIONS, which is the prototype's
const LABELS = {
  name: 'Nome',
  'name-desc': 'Nome (Z–A)',
  last: 'Sobrenome',
  young: 'Mais novos',
  old: 'Mais velhos',
  recent: 'Cadastro mais recente',
} as const satisfies Record<IListQuery['sort'], string>

const route = useRoute()
const { query, pending, setQuery } = useListQuery()
// The order the reader's last armed change pressed, kept until the chain has no step left in it
// (ADR-0023). It is not state on its way: `pending` alone says what is on the way to the URL, and
// the mark says what the arrows have already said. Nothing else reads it, and it never writes.
let pick: IListQuery['sort'] | undefined
// The reader left the list while the chain still had a step in it: the last navigation to start is
// the only one that wins (ADR-0023), so the step that starts last drops, and the steps after it
// inherit the drop
let leftList = false
// The mark has the say before both while a step of the traverse is still owed: the writes of the
// traverse are one behind the other, and a render between two of them reads the one on its way,
// which carries the step before what the arrows already moved the select to. Drawing from it alone
// would put what the option was up to one behind the reader, and the next arrow would step from
// there, so the traverse could end in the middle.
const current = computed(() => {
  const base = pending() ?? query.value
  return pick === undefined ? base : { ...base, sort: pick }
})
const selectRef = useTemplateRef('select')

// The arrows of the keyboard open a traverse of the orders (#107): the first change armed by them
// pushes, and the armed changes after it rewrite that same entry with `replace`, each waiting for
// the write before it to land — the arrows of a burst come before the navigations, and a replace
// made on a push on its way would leave one entry per arrow (the coercion of ADR-0023). The mouse
// and the touch are not the traverse: they push always, so blur, a press on the select and Escape
// or Enter take the armed state apart, and an arrow with a modifier never arms it
let armed = false
// Whether the traverse already pushed its entry: the armed changes after it rewrite it
let entered = false
// The write of the armed changes so far, carrying whether it landed. Every armed change joins this
// chain and replaces it at once, so a burst lines its writes up, one after the write before it. A
// write that did not land (another write cancelled it, a guard aborted it) is a `false` too, so the
// change after it does not fall for it and pushes: it does not take the place of the entry the
// other write is adding (ADR-0023). The chain takes a write that threw in as a `false` as well, so
// the burst keeps going when one of its writes does not land.
let chain: Promise<boolean> = Promise.resolve(true)

// One armed change joins the chain (so it does not race the write before it) and writes: it
// rewrites the traverse's entry with `replace`, unless the traverse has not pushed yet, or the
// write before it did not land. A navigation does not come back empty-handed when it does not
// land: the promise resolves with the failure of it (abort, cancel). One that throws rejects, the
// same outcome: `false` is one more write that fell through.
function armedChange(sort: IListQuery['sort']) {
  pick = sort
  const step = chain.then((landed) => {
    // The reader is no longer on the list (a card, a link, the history): the queued step ran last
    // and would beat the navigation the reader made (leftList passes the drop down the chain)
    if (leftList || route.path !== LIST_PATH) {
      leftList = true
      pick = undefined
      return false
    }
    const replace = entered && landed
    entered = true
    const write = setQuery({ sort, page: 1 }, { replace })
    return write.then(
      (failure) => !failure,
      () => false,
    )
  })
  chain = step
  // The mark holds while the chain still has a step owed: once this one is the tail, its outcome is
  // the last of the traverse and the URL is all there is again, as it is for every other writer
  void step.then(() => {
    if (chain === step) pick = undefined
  })
}

// Escape and Enter end a pick, so they end the traverse; a modified arrow is a shortcut of the
// browser or of the page, not a step of the traverse
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape' || event.key === 'Enter') {
    disarm()
    return
  }
  if (
    (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  ) {
    armed = true
  }
}

// A pick with the mouse or the touch is not the keyboard's traverse: a press on the select reopens
// the menu on the same focus, and its next pick pushes again; so does leaving the select
function disarm() {
  armed = false
  entered = false
}

// An order that is not from the traverse starts over from page 1 and keeps the rest of the list
// state, the writes still on their way included (useListQuery). It is a history entry, so back takes
// it back (ADR-0007). The select is above the list: it keeps the focus and its place on the page, so
// there is no anchoring to do (ADR-0022). The value goes back through the URL validator.
function change(event: Event) {
  const { target } = event
  if (!(target instanceof HTMLSelectElement)) return
  const { sort } = parseListQuery({ sort: target.value })
  if (armed) {
    armedChange(sort)
    return
  }
  void setQuery({ sort, page: 1 })
}

// Puts the select on what the URL says
function syncSelect() {
  const select = selectRef.value
  if (select instanceof HTMLSelectElement) select.value = query.value.sort
}

// Vue writes `selected` only when the order the select is drawn from changes. A pick that is cancelled
// after the select was drawn from it is drawn back by that. One that a write made in the same tick
// takes back, before anything is drawn from it, leaves the select with the click. Once nothing is on
// its way the URL is all there is: put the select back on it, as the panel does with its controls
// (FilterPanel.vue). The select is one element that is always there, so unlike the panel's rows it does
// not matter whether the render comes first. While the mark stands, the URL is behind what the
// arrows already said, so the sync waits until the mark is spent too and nothing of the traverse is
// owed (ADR-0023).
watch(pending, (inFlight) => {
  if (inFlight === undefined && pick === undefined) syncSelect()
})
</script>

<template>
  <label
    :class="[S.Root, variant === 'card' ? S.Card : S.Bar]"
    data-testid="sort-select__root--label"
  >
    <span :class="S.Caption" data-testid="sort-select__caption--text">{{ CAPTIONS[variant] }}</span>
    <select
      ref="select"
      :class="S.Select"
      data-testid="sort-select__select--select"
      @change="change"
      @keydown="keydown"
      @blur="disarm"
      @mousedown="disarm"
    >
      <option
        v-for="option in SORT_OPTIONS"
        :key="option"
        :value="option"
        :selected="option === current.sort"
      >
        {{ LABELS[option] }}
      </option>
    </select>
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      :class="S.Chevron"
      data-testid="sort-select__chevron--icon"
    >
      <path d="M6 9l6 6 6-6"></path>
    </svg>
  </label>
</template>
