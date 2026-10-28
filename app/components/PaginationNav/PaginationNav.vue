<script setup lang="ts">
import { PER_PAGE_OPTIONS, parseListQuery, serializeListQuery } from '#shared/utils/listQuery'
import { pageList } from '#shared/utils/pageList'
import S from './PaginationNav.module.scss'

// page and totalPages come from the BFF answer, never from the URL: a page past the end is clamped
// there. loading is true while the page waits for the next answer.
const props = defineProps<{
  page: number
  totalPages: number
  loading: boolean
}>()

const { query, pending, setQuery } = useListQuery()
const perPageId = useId()

// Both lists are in the HTML and CSS shows one per width (ADR-0014)
const lists = computed(() =>
  [false, true].map((compact) => ({
    compact,
    items: pageList(props.page, props.totalPages, compact),
  })),
)

// The list state with another page: the page size stays, the defaults stay out of the URL. It is the
// state of the write still on its way when there is one: a click on a link cancels that write, and
// the page it lands on has to carry what the write was writing (ADR-0023).
// RouterLink treats every link to this route as exact-active (it ignores the query), so each link
// sets aria-current-value="false", and the current page is a span with a fixed aria-current. ARIA
// 1.2 bars a name on a span, so what a screen reader says ("Página 4, atual") is hidden text.
function pageLink(page: number) {
  return { query: serializeListQuery({ ...(pending() ?? query.value), page }) }
}

// Where the select was when the page size changed, until the new list is in (not reactive). The list
// above it changes height twice (the skeleton always has 9 cards) and no browser reliably holds the
// select: none anchors with the page at the top (css-scroll-anchoring), Safari before 27 never
// does, and Chromium stopped once the results got a wrapper that stays through the swap (#72).
let anchor: { el: HTMLSelectElement; top: number } | undefined
// Any scroll the reader starts while the list loads wins: going back to the original top would undo
// it (a wheel, a touch, or a page link that scrolls to the results). Not a scrollY check: the page
// gets shorter when the skeleton comes in and the browser moves scrollY back by itself. The keydown
// that changed the select has already gone by when the change event runs.
const forget = () => {
  anchor = undefined
}

// Another page size starts over from page 1. The value goes back through the URL validator.
async function changePerPage(event: Event) {
  const { target } = event
  if (!(target instanceof HTMLSelectElement)) return
  const { perPage } = parseListQuery({ perPage: target.value })
  anchor = { el: target, top: target.getBoundingClientRect().top }
  for (const type of ['wheel', 'touchmove', 'pointerdown', 'keydown'] as const)
    window.addEventListener(type, forget, { once: true, passive: true })
  const failure = await setQuery({ page: 1, perPage })
  // A navigation that did not happen has no loading to wait for
  if (failure) anchor = undefined
}

// The select goes back to where it was at each change of height: the skeleton, then the new list.
// Each distance is measured from the original top, a frame later: whatever anchoring the browser
// did by itself in the meantime leaves about zero to correct, so nothing is added twice.
watch(
  () => props.loading,
  (loading) => {
    if (!anchor) return
    const { el, top } = anchor
    if (!loading) anchor = undefined
    requestAnimationFrame(() => {
      // The nav is gone when the answer failed before the frame
      if (!el.isConnected) return
      window.scrollBy(0, el.getBoundingClientRect().top - top)
    })
  },
)
</script>

<template>
  <div :class="S.Root">
    <nav aria-label="Paginação" :class="S.Nav" data-testid="pagination__root--nav">
      <NuxtLink
        v-if="page > 1"
        :to="pageLink(page - 1)"
        aria-label="Página anterior"
        aria-current-value="false"
        :class="[S.Arrow, S.Active]"
        data-testid="pagination__prev--link"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" :class="S.Chevron">
          <path d="M15 6l-6 6 6 6"></path>
        </svg>
      </NuxtLink>
      <span
        v-else
        aria-hidden="true"
        :class="[S.Arrow, S.Inactive]"
        data-testid="pagination__prev--text"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" :class="S.Chevron">
          <path d="M15 6l-6 6 6 6"></path>
        </svg>
      </span>
      <ol
        v-for="list in lists"
        :key="String(list.compact)"
        :class="[S.List, list.compact ? S.Compact : S.Full]"
        :data-testid="list.compact ? 'pagination__compact--list' : 'pagination__full--list'"
      >
        <li
          v-for="(item, index) in list.items"
          :key="item === '…' ? `gap-${index}` : item"
          :aria-hidden="item === '…' ? 'true' : undefined"
          data-testid="pagination__page--item"
        >
          <span v-if="item === '…'" :class="S.Gap">…</span>
          <span
            v-else-if="item === page"
            aria-current="page"
            :class="[S.Item, S.Current]"
            data-testid="pagination__current--text"
          >
            <span class="VisuallyHidden" data-testid="pagination__current--label">
              Página {{ item }}, atual
            </span>
            <span aria-hidden="true" data-testid="pagination__current--number">{{ item }}</span>
          </span>
          <NuxtLink
            v-else
            :to="pageLink(item)"
            :aria-label="`Página ${item}`"
            aria-current-value="false"
            :class="[S.Item, S.Link]"
            data-testid="pagination__page--link"
          >
            {{ item }}
          </NuxtLink>
        </li>
      </ol>
      <NuxtLink
        v-if="page < totalPages"
        :to="pageLink(page + 1)"
        aria-label="Próxima página"
        aria-current-value="false"
        :class="[S.Arrow, S.Active]"
        data-testid="pagination__next--link"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" :class="S.Chevron">
          <path d="M9 6l6 6-6 6"></path>
        </svg>
      </NuxtLink>
      <span
        v-else
        aria-hidden="true"
        :class="[S.Arrow, S.Inactive]"
        data-testid="pagination__next--text"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" :class="S.Chevron">
          <path d="M9 6l6 6-6 6"></path>
        </svg>
      </span>
    </nav>
    <div :class="S.PerPage">
      <label :for="perPageId" data-testid="pagination__per-page--label">Itens por página</label>
      <select
        :id="perPageId"
        :class="S.Select"
        data-testid="pagination__per-page--select"
        @change="changePerPage"
      >
        <option
          v-for="option in PER_PAGE_OPTIONS"
          :key="option"
          :value="option"
          :selected="option === query.perPage"
        >
          {{ option }}
        </option>
      </select>
    </div>
  </div>
</template>
