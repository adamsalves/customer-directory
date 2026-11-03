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

const { query, pending, setQuery } = useListQuery()
// The order the select shows: the write still on its way, if there is one, as the panel and the chips
// do, so both selects agree from the pick on and a pick that is cancelled is drawn back (ADR-0023)
const current = computed(() => pending() ?? query.value)
const selectRef = useTemplateRef('select')

// Another order starts over from page 1 and keeps the rest of the list state, the writes still on
// their way included (useListQuery). It is a history entry, so back takes it back (ADR-0007). The
// select is above the list: it keeps the focus and its place on the page, so there is no anchoring to
// do (ADR-0022). The value goes back through the URL validator.
function change(event: Event) {
  const { target } = event
  if (!(target instanceof HTMLSelectElement)) return
  const { sort } = parseListQuery({ sort: target.value })
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
// not matter whether the render comes first.
watch(pending, (inFlight) => {
  if (inFlight === undefined) syncSelect()
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
