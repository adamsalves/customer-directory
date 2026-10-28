<script setup lang="ts">
import { BRAZILIAN_STATES } from '#shared/utils/brazilianStates'
import type { IListQuery } from '#shared/utils/listQuery'
import { GENDERS } from '~/utils/genders'
import { focusResults } from '~/utils/resultsScroll'
import S from './FilterChips.module.scss'

// `without` is what the chip takes out of the list state, worked out when it is clicked: a write may
// be on its way that the chip, drawn a frame ago, does not know about
type TChip = {
  key: string
  label: string
  ariaLabel: string
  without: (state: IListQuery) => Partial<IListQuery>
}

const searchChip = (search: string): TChip => ({
  key: 'search',
  label: `Busca: “${search}”`,
  ariaLabel: `Remover busca ${search}`,
  without: () => ({ search: '' }),
})

const stateChip = ({ slug, name }: { slug: string; name: string }): TChip => ({
  key: slug,
  label: name,
  ariaLabel: `Remover filtro ${name}`,
  without: ({ states }) => ({ states: states.filter((picked) => picked !== slug) }),
})

const genderChip = ({ label }: { label: string }): TChip => ({
  key: 'gender',
  label,
  ariaLabel: `Remover filtro ${label}`,
  without: () => ({ gender: 'all' }),
})

const { query, pending, setQuery } = useListQuery()

// The search, the states and the gender, in that order (the prototype's). The states come in the
// order of the table, as the URL keeps them, and the gender "all" is no filter. Drawn from the write
// still on its way, if there is one: the chip goes with the click, as the box of the panel does, and
// comes back by itself if that write is cancelled (ADR-0023).
const chips = computed(() => {
  const { search, states, gender } = pending() ?? query.value
  return [
    ...(search === '' ? [] : [searchChip(search)]),
    ...BRAZILIAN_STATES.filter(({ slug }) => states.includes(slug)).map(stateChip),
    ...GENDERS.filter(({ value }) => value !== 'all' && value === gender).map(genderChip),
  ]
})

// The chip goes away and the focus it holds would fall to the page, so it moves first, to the next
// chip, else the previous one, else the results (ADR-0022). The removal is made on the list state
// still on its way, so two in a row add up. Like any other filter it starts over from page 1 and is
// a history entry, so back takes it back (ADR-0007).
function remove(chip: TChip, event: MouseEvent) {
  const { currentTarget } = event
  const item = currentTarget instanceof HTMLElement ? currentTarget.closest('li') : null
  const neighbour = (item?.nextElementSibling ?? item?.previousElementSibling)?.querySelector(
    'button',
  )
  if (neighbour) neighbour.focus()
  else focusResults()
  void setQuery({ ...chip.without(pending() ?? query.value), page: 1 })
}
</script>

<template>
  <ul
    v-if="chips.length > 0"
    aria-label="Filtros ativos"
    :class="S.Chips"
    data-testid="filter-chips__root--list"
  >
    <li v-for="chip in chips" :key="chip.key" :class="S.Item">
      <button
        type="button"
        :aria-label="chip.ariaLabel"
        :class="S.Chip"
        data-testid="filter-chips__chip--button"
        @click="remove(chip, $event)"
      >
        <span :class="S.Label">{{ chip.label }}</span>
        <svg
          aria-hidden="true"
          :class="S.Icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18"></path>
        </svg>
      </button>
    </li>
  </ul>
</template>
