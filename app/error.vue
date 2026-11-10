<script setup lang="ts">
import type { NuxtError } from '#app'
import { RESULTS_ID, focusResults } from '~/utils/resultsScroll'
import S from './error.module.scss'

const props = defineProps<{ error: NuxtError }>()

// Only a 404 is a link gone stale. Any other (the source down, a bug) is not the link's fault, and
// "try again" is the honest advice.
const notFound = computed(() => props.error.status === 404)
const heading = computed(() => (notFound.value ? 'Cliente não encontrado' : 'Algo deu errado'))
const text = computed(() =>
  notFound.value
    ? 'O link pode estar desatualizado ou o cliente não existe mais.'
    : 'Não foi possível abrir esta página. Tente novamente em instantes.',
)

// The title says which error this is: a screen reader does not announce an alert that is already in
// the HTML of a page load, but it reads the title
useSeoMeta({ title: () => `${heading.value} · Juntos Somos Mais` })

// The h1 is slot content of <NuxtLayout>, where useTemplateRef does not resolve its type: an
// explicitly typed ref keeps it honest
const titleRef = ref<HTMLHeadingElement | null>(null)

// A view replaced in the middle of an SPA navigation leaves the focus on <body> (a direct URL access
// starts there too): on mount the h1 takes it, so the keyboard and the screen reader have an entry
// point in the page (ADR-0024)
onMounted(() => titleRef.value?.focus())

// The leaving of the error through this link is one more swap of the view in the middle of a client
// navigation, and the focus it held would fall to <body>: the results take it, the same element a
// page change inside the list gives it to. The navigation stays the link's own: the router of Nuxt
// walks one at a time, and a second of it started beside the first unwinds both pages (their two
// first asks of the BFF abort) and brings the app to a new error of its own. The announcer of the
// layout, who renders this page and survives the swap, announces the list on the landing (ADR-0022,
// ADR-0024)
function goToList(event: MouseEvent) {
  // A modified and a middle-button click are the browser's — the link goes to another tab or
  // window — and not a navigation of this tab, so we return and the click keeps its default. It is
  // the same cut the router's own guard makes on its link clicks (ADR-0024)
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
  void focusTheResultsWhenThePageRenders()
}

// The page the link lands carries its first ask of the BFF on its way, so the results come a beat
// after the URL has changed: a frame at a time, and no endless wait — without them after three
// hundred of them the landing failed outright and the reader keeps where the page left them
async function focusTheResultsWhenThePageRenders() {
  for (let turn = 0; turn <= 300; turn += 1) {
    if (document.getElementById(RESULTS_ID)) {
      focusResults()
      return
    }
    // A frame per turn: the render of the list is one a Suspense away from the answer of the BFF
    await new Promise(requestAnimationFrame)
  }
}
</script>

<template>
  <!-- app.vue does not render on an error, and the layout is rendered there: asking for it here
       brings back the header, the theme toggle and the toast -->
  <NuxtLayout>
    <div :class="S.ErrorPage" data-testid="error-page__root--div">
      <!-- The alert is the message only: the link is no part of what is announced -->
      <div role="alert" :class="S.Message" data-testid="error-page__message--alert">
        <h1 ref="titleRef" tabindex="-1" :class="S.Title" data-testid="error-page__title--heading">
          {{ heading }}
        </h1>
        <p :class="S.Text" data-testid="error-page__text--paragraph">{{ text }}</p>
      </div>
      <!-- A navigation that lands clears the error (the router plugin of Nuxt), so no clearError.
           The click stays the link's own; goToList only reads it for what the browser owns -->
      <NuxtLink
        to="/customers"
        :class="S.Link"
        data-testid="error-page__list--link"
        @click="goToList"
      >
        Ver lista de clientes
      </NuxtLink>
    </div>
  </NuxtLayout>
</template>
