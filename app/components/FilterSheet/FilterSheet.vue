<script setup lang="ts">
import type { ICustomerFacets } from '#shared/types/customer'
import S from './FilterSheet.module.scss'

// Both come from the BFF answer: the last one while the next is on its way, as the counts of the
// panel do, and none after a failed one.
const props = defineProps<{ total: number | undefined; facets: ICustomerFacets | undefined }>()

const { query, pending, setQuery } = useListQuery()
// The list state the bar shows: the write still on its way, if there is one, as the panel and the
// chips do (ADR-0023)
const current = computed(() => pending() ?? query.value)
// The states and the gender picked. The search is not a filter here: it has its own field.
const count = computed(() => current.value.states.length + (current.value.gender === 'all' ? 0 : 1))

const label = computed(() =>
  count.value === 0
    ? 'Filtros'
    : `Filtros, ${String(count.value)} ${count.value === 1 ? 'ativo' : 'ativos'}`,
)

// "Ver N clientes" (ADR-0020). While the next answer loads it keeps the last total, and with none
// (a failed request) it names no number.
const action = computed(() => {
  const { total } = props
  if (total === undefined) return 'Ver clientes'
  if (total === 0) return 'Nenhum resultado'
  return total === 1 ? 'Ver 1 cliente' : `Ver ${String(total)} clientes`
})

const titleId = useId()
const dialogRef = useTemplateRef('dialog')
// The panel is in the sheet only while it is open: the page already has one, and two would repeat
// every `data-testid` and the 27 states in the HTML
const open = ref(false)

// The panel is in the dialog before it shows, so the sheet comes up with its whole height
async function openSheet() {
  open.value = true
  await nextTick()
  const dialog = dialogRef.value
  if (dialog instanceof HTMLDialogElement) dialog.showModal()
}

// Esc, the close button, the action button and a click on the backdrop all end in the `close` event
// of the dialog, which is what puts `open` down. The browser gives the focus back to the button that
// opened the sheet.
// ponytail: a sheet that is open when the screen grows to 960px stays open, since the width is CSS
// only (ADR-0014), and when it closes there the button is gone and the focus falls to the body.
// Upgrade: close it from a matchMedia listener, which ADR-0014 would have to allow.
function close() {
  const dialog = dialogRef.value
  if (dialog instanceof HTMLDialogElement) dialog.close()
}

// A click on the backdrop lands on the dialog itself, a click in the sheet on what is inside it. The
// grip, the header, the body and the footer cover the whole box, so no click inside lands on the bare
// dialog. A drag that begins inside and lets go on the backdrop also clicks the dialog, the closest
// element that holds both, so the press must have begun on the backdrop too.
let pressedOnBackdrop = false

function trackPress({ target }: PointerEvent) {
  pressedOnBackdrop = target === dialogRef.value
}

function closeOnBackdrop({ target }: MouseEvent) {
  if (pressedOnBackdrop && target === dialogRef.value) close()
}

// Only the states and the gender, the search stays (the prototype's). With none picked the button is
// kept in the tab order and does nothing: `aria-disabled` and not `disabled`, which would drop the
// focus the click leaves on it.
function clear() {
  if (count.value === 0) return
  void setQuery({ states: [], gender: 'all', page: 1 })
}
</script>

<template>
  <div :class="S.Bar" data-testid="filter-sheet__bar--div">
    <button
      type="button"
      aria-haspopup="dialog"
      :aria-label="label"
      :class="S.Trigger"
      data-testid="filter-sheet__open--button"
      @click="openSheet"
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
      >
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8"></path>
        <circle cx="16" cy="7" r="2"></circle>
        <circle cx="10" cy="17" r="2"></circle>
      </svg>
      <span>Filtros</span>
      <span
        v-if="count > 0"
        aria-hidden="true"
        :class="S.Badge"
        data-testid="filter-sheet__badge--text"
      >
        {{ count }}
      </span>
    </button>
  </div>
  <!-- Beside the bar and not in it: CSS takes the bar out of the page from 960px, and a sheet that is
       open then stays (ADR-0014) -->
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    :class="S.Sheet"
    data-testid="filter-sheet__root--dialog"
    @pointerdown="trackPress"
    @click="closeOnBackdrop"
    @close="open = false"
  >
    <div aria-hidden="true" :class="S.Grip" data-testid="filter-sheet__grip--div"></div>
    <div :class="S.Header" data-testid="filter-sheet__header--div">
      <h2 :id="titleId" :class="S.Title" data-testid="filter-sheet__title--heading">Filtros</h2>
      <button
        type="button"
        aria-label="Fechar filtros"
        :class="S.Close"
        data-testid="filter-sheet__close--button"
        @click="close"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18"></path>
        </svg>
      </button>
    </div>
    <div :class="S.Body" data-testid="filter-sheet__body--div">
      <FilterPanel v-if="open" variant="sheet" :facets="facets" />
    </div>
    <div :class="S.Footer" data-testid="filter-sheet__footer--div">
      <button
        type="button"
        :aria-disabled="count === 0 ? 'true' : undefined"
        :class="S.Clear"
        data-testid="filter-sheet__clear--button"
        @click="clear"
      >
        Limpar
      </button>
      <button
        type="button"
        :class="S.Apply"
        data-testid="filter-sheet__apply--button"
        @click="close"
      >
        {{ action }}
      </button>
    </div>
  </dialog>
</template>
