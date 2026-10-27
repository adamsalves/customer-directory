<script setup lang="ts">
import type { ICustomerFacets } from '#shared/types/customer'
import { BRAZILIAN_STATES, DEFAULT_STATE_SLUGS } from '#shared/utils/brazilianStates'
import type { IListQuery } from '#shared/utils/listQuery'
import S from './FilterPanel.module.scss'

// The facets come from the BFF answer, never from the URL. There is none while no answer has come
// (or after a failed one): the panel then has no counts.
const props = defineProps<{ facets: ICustomerFacets | undefined }>()

defineEmits<{ clear: [] }>()

const GENDERS = [
  { value: 'all', label: 'Todos' },
  { value: 'female', label: 'Feminino' },
  { value: 'male', label: 'Masculino' },
] as const satisfies readonly { value: IListQuery['gender']; label: string }[]

const isDefaultState = (slug: string) =>
  DEFAULT_STATE_SLUGS.some((defaultSlug) => defaultSlug === slug)

// The five the panel always lists, in their order, and the other 22 after them, in the table's
// (alphabetical) order
const DEFAULT_STATES = DEFAULT_STATE_SLUGS.flatMap((slug) =>
  BRAZILIAN_STATES.filter((state) => state.slug === slug),
)
const OTHER_STATES = BRAZILIAN_STATES.filter(({ slug }) => !isDefaultState(slug))

const { query, setQuery } = useListQuery()
// Ids per instance: a second panel on the page (the sheet, #26) is a group of its own, and its list
// of states is another element
const genderName = useId()
const statesListId = useId()
// Whether "Ver todos" is open: a state of the screen, not of the list, so it stays local (ADR-0007)
const expanded = ref(false)
const toggleRef = useTemplateRef('toggle')

// The states in the list: the five, then the picked ones, or all of them once "Ver todos" is open.
// `states` is in table order, so the picked ones are as well. A state with nobody in it is dimmed
// unless it is picked: a pick is never dimmed, it is what the list is filtered by (ADR-0013).
const stateRows = computed(() =>
  [
    ...DEFAULT_STATES,
    ...OTHER_STATES.filter(({ slug }) => expanded.value || query.value.states.includes(slug)),
  ].map(({ slug, name }) => {
    const checked = query.value.states.includes(slug)
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
    checked: query.value.gender === value,
    count: props.facets?.gender[value],
  })),
)

// A search alone shows it too: the button clears the search as well (the prototype's)
const hasFilter = computed(
  () => query.value.search !== '' || query.value.states.length > 0 || query.value.gender !== 'all',
)

// What a screen reader says in place of the bare number (ADR-0013)
function countLabel(count: number) {
  return `${String(count)} ${count === 1 ? 'cliente' : 'clientes'}`
}

// The list state of the last pick the URL does not have yet (not reactive). A second pick in that
// frame builds on it: made on the URL's state, it would take the first pick back.
let pending: IListQuery | undefined

// Another filter starts over from page 1 and keeps the rest of the list state. Each pick is a
// history entry, so back takes it back (ADR-0007).
function pick(change: Partial<Pick<IListQuery, 'states' | 'gender'>>) {
  const next = { ...(pending ?? query.value), ...change, page: 1 }
  pending = next
  void setQuery(next).finally(() => {
    // Landed, or aborted or replaced by a later pick: either way this one is not on its way anymore
    if (pending === next) pending = undefined
  })
}

// In the short list a state outside the five is there only while it is picked, so unpicking it
// takes its row off the page, and the focus with it. The toggle is what stays under the list.
function focusToggle() {
  const button = toggleRef.value
  if (button instanceof HTMLButtonElement) button.focus()
}

function toggleState(slug: string) {
  const { states } = pending ?? query.value
  if (!expanded.value && !isDefaultState(slug)) focusToggle()
  pick({
    states: states.includes(slug) ? states.filter((picked) => picked !== slug) : [...states, slug],
  })
}
</script>

<template>
  <div :class="S.Panel" data-testid="filter-panel__root--div">
    <fieldset :class="S.Group" data-testid="filter-panel__states--fieldset">
      <legend :class="S.Legend">Por Estado</legend>
      <div :id="statesListId" :class="S.Options">
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
      <div :class="S.Options">
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
      </div>
    </fieldset>
    <button
      v-if="hasFilter"
      type="button"
      :class="S.Clear"
      data-testid="filter-panel__clear--button"
      @click="$emit('clear')"
    >
      Limpar filtros
    </button>
  </div>
</template>
