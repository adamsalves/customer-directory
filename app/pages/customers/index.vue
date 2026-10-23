<script setup lang="ts">
import { DEFAULT_PER_PAGE, serializeListQuery } from '#shared/utils/listQuery'
import { RESULTS_ID, focusResults } from '~/utils/resultsScroll'
import S from './index.module.scss'

// The first row of the grid is on screen at load: its images skip lazy loading and the first one,
// the likely LCP, gets high priority.
const EAGER_IMAGES = 4

const { query } = useListQuery()
// The canonical keys only, as in the page URL: the defaults and an empty search stay out
const apiQuery = computed(() => serializeListQuery(query.value))
// No retry of its own on a 502: the error state has a button for that, and a retry here would read
// the source twice and keep the error off the screen twice as long (ADR-0005)
const { data, status, refresh } = await useFetch('/api/customers', {
  query: apiQuery,
  retry: false,
})

// The button goes away when the skeleton comes in, and the focus it holds would fall to the page.
// The results stay through the reload, so the focus goes there first (ADR-0022).
function retry() {
  focusResults()
  void refresh()
}
</script>

<template>
  <div>
    <AppBreadcrumb :items="[{ label: 'Home', to: '/customers' }, { label: 'Clientes' }]" />
    <h1 :class="S.Title" data-testid="customers__title--heading">Lista de clientes</h1>
    <!-- One element for the skeleton, the error and the list, so the focus a page change or a retry
         leaves here is not lost when the skeleton goes -->
    <section
      :id="RESULTS_ID"
      tabindex="-1"
      aria-label="Resultados"
      :class="S.Results"
      data-testid="customers__results--section"
    >
      <ul
        v-if="status === 'pending'"
        aria-busy="true"
        aria-label="Carregando clientes"
        :class="S.List"
        data-testid="customers__skeleton--list"
      >
        <li v-for="index in DEFAULT_PER_PAGE" :key="index" :class="S.Item">
          <CustomerCardSkeleton />
        </li>
      </ul>
      <!-- Keyed on `status`: on a retry `error` keeps the last failure until the answer comes -->
      <ErrorState v-else-if="status === 'error'" @retry="retry" />
      <ul v-else-if="data" :class="S.List" data-testid="customers__list--list">
        <li v-for="(customer, index) in data.items" :key="customer.slug" :class="S.Item">
          <CustomerCard
            :customer="customer"
            :loading="index < EAGER_IMAGES ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : undefined"
          />
        </li>
      </ul>
    </section>
    <!-- Outside the skeleton/list branches, so it stays mounted while the next page loads. The
         select keeps the focus; any page change, by number or by arrow, moves it to the results,
         since a page link turns into the current-page span. `data` holds the previous answer until
         then -->
    <PaginationNav
      v-if="data"
      :page="data.page"
      :total-pages="data.totalPages"
      :loading="status === 'pending'"
    />
  </div>
</template>
