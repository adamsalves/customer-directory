<script setup lang="ts">
import type { ICustomerFacets } from '#shared/types/customer'
import { BRAZILIAN_STATES, DEFAULT_STATE_SLUGS } from '#shared/utils/brazilianStates'
import { hasFilters, type IListQuery } from '#shared/utils/listQuery'
import { GENDERS } from '~/utils/genders'
import S from './FilterPanel.module.scss'

// The facets come from the BFF answer, never from the URL. There is none while no answer has come
// (or after a failed one): the panel then has no counts. `aside` is the card of the page from 960px;
// `sheet` is the same panel in the dialog below it (#26), with every state listed and no clear button
// of its own, since the sheet has one.
const props = withDefaults(
  defineProps<{ facets: ICustomerFacets | undefined; variant?: 'aside' | 'sheet' }>(),
  { variant: 'aside' },
)

defineEmits<{ clear: [] }>()

const isDefaultState = (slug: string) =>
  DEFAULT_STATE_SLUGS.some((defaultSlug) => defaultSlug === slug)

// The five the panel always lists, in their order, and the other 22 after them, in the table's
// (alphabetical) order
const DEFAULT_STATES = DEFAULT_STATE_SLUGS.flatMap((slug) =>
  BRAZILIAN_STATES.filter((state) => state.slug === slug),
)
const OTHER_STATES = BRAZILIAN_STATES.filter(({ slug }) => !isDefaultState(slug))

const { query, pending, setQuery } = useListQuery()
// The list state the panel shows: the write still on its way, if there is one, so the boxes, the
// clear button and the chips (FilterChips) agree from the click on (ADR-0023)
const current = computed(() => pending() ?? query.value)
// Ids per instance: a second panel on the page (the sheet, #26) is a group of its own, and its list
// of states is another element
const genderName = useId()
const statesListId = useId()
// Whether "Ver todos" is open: a state of the screen, not of the list, so it stays local (ADR-0007)
const expanded = ref(false)
const toggleRef = useTemplateRef('toggle')

// The states in the list: the five, then the picked ones, or all of them once "Ver todos" is open
// (the sheet has no such button: it lists them all). `states` is in table order, so the picked ones
// are as well. A state with nobody in it is dimmed unless it is picked: a pick is never dimmed, it
// is what the list is filtered by (ADR-0013).
const stateRows = computed(() =>
  [
    ...DEFAULT_STATES,
    ...OTHER_STATES.filter(
      ({ slug }) =>
        props.variant === 'sheet' || expanded.value || current.value.states.includes(slug),
    ),
  ].map(({ slug, name }) => {
    const checked = current.value.states.includes(slug)
    const count = props.facets?.states[slug]
    return { slug, name, checked, count, dimmed: count === 0 && !checked }
  }),
)

const toggleLabel = computed(() =>
  expanded.value ? 'Ver menos' : `Ver todos (${String(BRAZILIAN_STATES.length)})`,
)

const genderRows = computed(() =>
  GENDERS.map(({ value, label }) => ({
    value,
    label,
    checked: current.value.gender === value,
    count: props.facets?.gender[value],
  })),
)

// A search alone shows it too: the button clears the search as well (the prototype's)
const hasFilter = computed(() => current.value.search !== '' || hasFilters(current.value))

// What a screen reader says in place of the bare number (ADR-0013)
function countLabel(count: number) {
  return `${String(count)} ${count === 1 ? 'cliente' : 'clientes'}`
}

const rootRef = useTemplateRef('root')

// Puts each control on what the URL says
function syncControls() {
  const root = rootRef.value
  if (!(root instanceof HTMLElement)) return
  const { states, gender } = query.value
  for (const input of root.querySelectorAll('input')) {
    input.checked = input.type === 'radio' ? input.value === gender : states.includes(input.value)
  }
}

// Vue writes `checked` only when a row's value changes, so a pick that never reaches the URL leaves
// its control with the click: the pick was cancelled by back or a link, or by a write (the clear of
// the page) that lands with the states the URL already had. A write that carries the pick (the next
// pick, the search) keeps it on its way until it lands, and the controls stay as clicked meanwhile.
// Once nothing is on its way the URL is all there is: put the controls back on it, after the render.
watch(
  pending,
  (inFlight) => {
    if (inFlight === undefined) syncControls()
  },
  { flush: 'post' },
)

// Another filter starts over from page 1 and keeps the rest of the list state, the writes still on
// their way included (useListQuery). Each pick is a history entry, so back takes it back (ADR-0007).
function pick(change: Partial<Pick<IListQuery, 'states' | 'gender'>>) {
  void setQuery({ ...change, page: 1 })
}

// In the short list a state outside the five is there only while it is picked, so unpicking it
// takes its row off the page, and the focus with it. The toggle is what stays under the list.
function focusToggle() {
  const button = toggleRef.value
  if (button instanceof HTMLButtonElement) button.focus()
}

function toggleState(slug: string) {
  const { states } = current.value
  if (!expanded.value && !isDefaultState(slug)) focusToggle()
  pick({
    states: states.includes(slug) ? states.filter((picked) => picked !== slug) : [...states, slug],
  })
}
</script>

<template>
  <div
    ref="root"
    :class="[S.Panel, variant === 'sheet' && S.Sheet]"
    data-testid="filter-panel__root--div"
  >
    <fieldset :class="S.Group" data-testid="filter-panel__states--fieldset">
      <legend :class="S.Legend">Por Estado</legend>
      <div :id="statesListId">
        <label v-for="row in stateRows" :key="row.slug" :class="[S.Option, row.dimmed && S.Dimmed]">
          <input
            type="checkbox"
            :value="row.slug"
            :checked="row.checked"
            :class="S.Input"
            data-testid="filter-panel__state--checkbox"
            @change="toggleState(row.slug)"
          />
          <span :class="S.Name" data-testid="filter-panel__name--text">{{ row.name }}</span>
          <span
            v-if="row.count !== undefined"
            :class="S.Count"
            data-testid="filter-panel__count--text"
          >
            <span class="VisuallyHidden" data-testid="filter-panel__count--label">
              {{ countLabel(row.count) }}
            </span>
            <span aria-hidden="true" data-testid="filter-panel__count--number">
              {{ row.count }}
            </span>
          </span>
        </label>
      </div>
      <button
        v-if="variant === 'aside'"
        ref="toggle"
        type="button"
        :aria-expanded="expanded"
        :aria-controls="statesListId"
        :class="S.Toggle"
        data-testid="filter-panel__toggle--button"
        @click="expanded = !expanded"
      >
        {{ toggleLabel }}
      </button>
    </fieldset>
    <fieldset :class="S.Group" data-testid="filter-panel__gender--fieldset">
      <legend :class="S.Legend">Por Gênero</legend>
      <label v-for="row in genderRows" :key="row.value" :class="S.Option">
        <input
          type="radio"
          :name="genderName"
          :value="row.value"
          :checked="row.checked"
          :class="S.Input"
          data-testid="filter-panel__gender--radio"
          @change="pick({ gender: row.value })"
        />
        <span :class="S.Name" data-testid="filter-panel__name--text">{{ row.label }}</span>
        <span
          v-if="row.count !== undefined"
          :class="S.Count"
          data-testid="filter-panel__count--text"
        >
          <span class="VisuallyHidden" data-testid="filter-panel__count--label">
            {{ countLabel(row.count) }}
          </span>
          <span aria-hidden="true" data-testid="filter-panel__count--number">
            {{ row.count }}
          </span>
        </span>
      </label>
    </fieldset>
    <button
      v-if="variant === 'aside' && hasFilter"
      type="button"
      :class="S.Clear"
      data-testid="filter-panel__clear--button"
      @click="$emit('clear')"
    >
      Limpar filtros
    </button>
  </div>
</template>
