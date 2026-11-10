<script setup lang="ts">
import {
  PER_PAGE_OPTIONS,
  parseListQuery,
  serializeListQuery,
  type IListQuery,
} from '#shared/utils/listQuery'
import { pageList } from '#shared/utils/pageList'
import S from './PaginationNav.module.scss'

// page and totalPages come from the BFF answer, never from the URL: a page past the end is clamped
// there. loading is true while the page waits for the next answer.
const props = defineProps<{
  page: number
  totalPages: number
  loading: boolean
}>()

const route = useRoute()
const { query, pending, setQuery } = useListQuery()
const perPageId = useId()
// The page size the reader's last armed change pressed, kept until the chain has no step left in it
// (ADR-0023). It is not state on its way: `pending` alone says what is on the way to the URL, and
// the mark says what the arrows have already said. The select is drawn from the URL the rest of the
// time (the links carry what is on the way), so the mark holds only while the traverse owes a step.
let pick: IListQuery['perPage'] | undefined
// The reader left the list while the chain still had a step in it: the last navigation to start is
// the only one that wins (ADR-0023), so the step that starts last drops, and the steps after it
// inherit the drop
let leftList = false

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
// it (a wheel, a touch, or a page link that scrolls to the toolbar). Not a scrollY check: the page
// gets shorter when the skeleton comes in and the browser moves scrollY back by itself. The keydown
// that changed the select has already gone by when the change event runs.
const forget = () => {
  anchor = undefined
}

// The arrows of the keyboard open a traverse of the page sizes (#107): the first change armed by
// them pushes, and the armed changes after it rewrite that same entry with `replace`, each waiting
// for the write before it to land — the arrows of a burst come before the navigations, and a
// replace made on a push on its way would leave one entry per arrow (the coercion of ADR-0023).
// The mouse and the touch are not the traverse: they push always, so blur, a press on the select
// and Escape or Enter take the armed state apart, and an arrow with a modifier never arms it
let armed = false
// Whether the traverse already pushed its entry: the armed changes after it rewrite it
let entered = false
// The write of the armed changes so far, carrying whether it landed. Every armed change joins this
// chain and replaces it at once, so a burst lines its writes up, one after the write before it. A
// write that did not land (another write cancelled it, a guard aborted it) is a `false` too, so
// the change after it does not fall for it and pushes: it does not take the place of the entry the
// other write is adding (ADR-0023). The chain takes a write that threw in as a `false` as well,
// so the burst keeps going when one of its writes does not land.
let chain: Promise<boolean> = Promise.resolve(true)

// One armed change joins the chain (so it does not race the write before it) and writes: it
// rewrites the traverse's entry with `replace`, unless the traverse has not pushed yet, or the
// write before it did not land. A navigation does not come back empty-handed when it does not
// land: the promise resolves with the failure of it (abort, cancel). One that throws rejects, the
// same outcome: `false` is one more write that fell through.
function armedChange(perPage: IListQuery['perPage']) {
  pick = perPage
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
    const write = setQuery({ page: 1, perPage }, { replace })
    return write.then(
      (failure) => {
        // A navigation that did not happen drops the anchor, unless a write that carries the page
        // size is on its way, as the rule of an unarmed change has it
        if (failure && pending()?.perPage !== perPage) anchor = undefined
        return !failure
      },
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

// A click that takes the reader off the list (a card, the breadcrumb) is an order the reader made:
// the last navigation to start is the only one that wins (ADR-0023), and the steps the chain still
// owes would start last. The handler of the link starts that navigation, and bubbling brings this
// listener right after it, still in the same task, so no queued step can start before it. A click
// with modifiers opens another tab and does not navigate this one, so it stays
function leaveOnLinkOffList(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  if (!(event.target instanceof Element)) return
  const anchor = event.target.closest('a[href]')
  if (!(anchor instanceof HTMLAnchorElement) || anchor.pathname === LIST_PATH) return
  leftList = true
  pick = undefined
}

onMounted(() => {
  window.addEventListener('click', leaveOnLinkOffList)
})

// A pick with the mouse or the touch is not the keyboard's traverse: a press on the select reopens
// the menu on the same focus, and its next pick pushes again; so does leaving the select
function disarm() {
  armed = false
  entered = false
}

// A page size that is not from the traverse starts over from page 1 and keeps the rest of the
// list state, the writes still on their way included (useListQuery). It is a history entry, so
// back takes it back (ADR-0007); an armed change rewrites the entry the traverse pushed instead.
// The value goes back through the URL validator.
async function changePerPage(event: Event) {
  const { target } = event
  if (!(target instanceof HTMLSelectElement)) return
  const { perPage } = parseListQuery({ perPage: target.value })
  anchor = { el: target, top: target.getBoundingClientRect().top }
  for (const type of ['wheel', 'touchmove', 'pointerdown', 'keydown'] as const)
    window.addEventListener(type, forget, { once: true, passive: true })
  if (armed) {
    armedChange(perPage)
    return
  }
  const failure = await setQuery({ page: 1, perPage })
  // A navigation that did not happen has no loading to wait for. Unless another write that cancelled
  // it carries the page size (the clear of the page, in the same frame): the list loads with that one.
  if (failure && pending()?.perPage !== perPage) anchor = undefined
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

onBeforeUnmount(() => {
  window.removeEventListener('click', leaveOnLinkOffList)
})
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
        @keydown="keydown"
        @blur="disarm"
        @mousedown="disarm"
      >
        <option
          v-for="option in PER_PAGE_OPTIONS"
          :key="option"
          :value="option"
          :selected="option === (pick ?? query.perPage)"
        >
          {{ option }}
        </option>
      </select>
    </div>
  </div>
</template>
