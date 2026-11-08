<script setup lang="ts">
import { serializeListQuery } from '#shared/utils/listQuery'
import { yearsSince } from '#shared/utils/yearsSince'
import { GENDERS } from '~/utils/genders'
import { telHref } from '~/utils/telHref'
import S from './[id].module.scss'

// `[id]` is one segment, so one string: String() only settles the type, which also allows the list
// of a catch-all. Read once: Nuxt keys the page by its path, so another customer is another page.
const slug = String(useRoute().params.id)

// The list state the address carries, which the card's link put there. A key the list does not know
// is dropped and a value it does not accept falls to the default, so `?foo=1&page=abc` goes back to
// the plain list.
const { query } = useListQuery()

// The context the BFF shapes around the customer (the position, the total, the neighbors) is the
// list state of the address too: the same search, filters and order the list used. What keeps
// useFetch from asking this same answer twice on a hash-only navigation is not the guard of this
// computed: the `query` of useListQuery already stays one and the same object while the list state
// is the same, and Vue only lets a computed through when its value changed. What this computed
// adds on top is a guard for callers without that gate: reading `route.query` straight would build
// a new object at every navigation, and a new object on the same list state would refetch.
const apiQuery = computed<Record<string, string>>((previous) => {
  const next = serializeListQuery(query.value)
  return previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next
})

// No retry of its own on a 502: a retry here would read the source twice and keep the answer off
// the screen twice as long (ADR-0005). The slug comes from the address, so it is encoded: a `../` in
// it cannot walk out of /api/customers/ to a route that answers with no customer (a 500, not a 404).
const { data, error } = await useFetch(`/api/customers/${encodeURIComponent(slug)}`, {
  query: apiQuery,
  retry: false,
})

// The status of the page is the one the BFF gave (404 for a slug that is no customer, 502 for the
// source down), and `fatal` takes the whole screen, for error.vue.
if (error.value || !data.value) {
  throw createError({
    status: error.value?.status ?? 500,
    statusText: error.value?.statusText,
    fatal: true,
  })
}
const { customer, position, total, prev, next, related } = data.value

// The way back is the list state the address carries, which the card's link put there.
const back = computed(() => ({ path: LIST_PATH, query: serializeListQuery(query.value) }))

// The photo is the large one and already absolute, so it needs no base URL
const title = `${customer.name} · Juntos Somos Mais`
useSeoMeta({ title, ogTitle: title, ogImage: customer.picture })

// The dates of the source are UTC and are read on UTC, as in yearsSince: at 01:00Z it is still the
// day before in Brazil, and the server may be in another zone than the browser
const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

// A state outside the 27 has no UF, and then no parentheses
const cityState = `${customer.city} · ${customer.state}${customer.uf ? ` (${customer.uf})` : ''}`
// Counted when the page renders, as in the hero: a count made by the BFF would stay frozen in the
// copy it caches (ADR-0005)
const age = yearsSince(customer.birthDate, new Date())
const birth = `${date(customer.birthDate)} (${String(age)} anos)`
const registered = `${date(customer.registeredAt)} · ${monthYear(customer.registeredAt)}`
const cellHref = telHref(customer.cell)
const phoneHref = telHref(customer.phone)
const gender = GENDERS.find(({ value }) => value === customer.gender)?.label ?? '—'

// Outside HTTPS there is no navigator.clipboard, and a browser may refuse the write: the first throws
// on the call, the second rejects it, and both end in the catch
const { show } = useToast()
async function copyEmail() {
  try {
    await navigator.clipboard.writeText(customer.email)
    show('E-mail copiado')
  } catch {
    show('Não foi possível copiar')
  }
}

// The template names the article by the heading of the hero (id "customer-name", in CustomerHero)
</script>

<template>
  <div>
    <!-- Below 640px "Voltar" is the way back, as in the prototype, which has no trail there -->
    <AppBreadcrumb
      hide-on-mobile
      :items="[
        { label: 'Home', to: '/customers' },
        { label: 'Clientes', to: back },
        { label: `Detalhes · ${customer.name}` },
      ]"
    />
    <div :class="S.Page">
      <NuxtLink :to="back" :class="S.Back" data-testid="customer-detail__back--link">
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
          data-testid="customer-detail__back--icon"
        >
          <path d="M15 6l-6 6 6 6"></path>
        </svg>
        Voltar para a lista
      </NuxtLink>
      <article
        aria-labelledby="customer-name"
        :class="S.Article"
        data-testid="customer-detail__root--article"
      >
        <CustomerHero :customer="customer" />
        <div :class="S.Sections" data-testid="customer-detail__sections--div">
          <CustomerInfoSection heading="Contato">
            <div>
              <dt>E-mail</dt>
              <dd :class="S.EmailValue" data-testid="customer-detail__email--value">
                <a :href="`mailto:${customer.email}`" data-testid="customer-detail__email--link">{{
                  customer.email
                }}</a>
                <!-- The title is the name and the tooltip; an aria-label next to it would make the same
                     text the description too, read twice -->
                <button
                  type="button"
                  title="Copiar e-mail"
                  :class="S.CopyButton"
                  data-testid="customer-detail__copy--button"
                  @click="copyEmail"
                >
                  <svg
                    aria-hidden="true"
                    data-testid="customer-detail__copy--icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linejoin="round"
                  >
                    <rect x="8" y="8" width="12" height="12" rx="2"></rect>
                    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"></path>
                  </svg>
                </button>
              </dd>
            </div>
            <div>
              <dt>Celular</dt>
              <dd :class="S.Tabular" data-testid="customer-detail__cell--value">
                <a :href="cellHref" data-testid="customer-detail__cell--link">{{
                  customer.cell
                }}</a>
              </dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd :class="S.Tabular" data-testid="customer-detail__phone--value">
                <a :href="phoneHref" data-testid="customer-detail__phone--link">{{
                  customer.phone
                }}</a>
              </dd>
            </div>
          </CustomerInfoSection>
          <CustomerInfoSection heading="Endereço">
            <div>
              <dt>Logradouro</dt>
              <dd>{{ customer.street }}</dd>
            </div>
            <div>
              <dt>Cidade / Estado</dt>
              <dd>{{ cityState }}</dd>
            </div>
            <div>
              <dt>CEP</dt>
              <dd :class="S.Tabular" data-testid="customer-detail__postcode--value">
                {{ customer.postcode }}
              </dd>
            </div>
            <div>
              <dt>Fuso horário</dt>
              <dd>{{ customer.timezone }}</dd>
            </div>
          </CustomerInfoSection>
          <CustomerInfoSection heading="Dados pessoais">
            <div>
              <dt>Data de nascimento</dt>
              <dd>{{ birth }}</dd>
            </div>
            <div>
              <dt>Gênero</dt>
              <dd>{{ gender }}</dd>
            </div>
            <div>
              <dt>Cliente desde</dt>
              <dd>{{ registered }}</dd>
            </div>
          </CustomerInfoSection>
        </div>
        <!-- The position, the neighbors and "N de M" are the context the answer carries: where this
             customer sat in the list the card was opened from. -->
        <CustomerNav :position="position" :total="total" :prev="prev" :next="next" />
        <!-- The others of the state the answer lists by name: each card opens the customer with the
             list state the address carries, and the link goes to the list of the state alone -->
        <CustomerRelated
          :customers="related"
          :state="customer.state"
          :state-slug="customer.stateSlug"
        />
      </article>
    </div>
  </div>
</template>
