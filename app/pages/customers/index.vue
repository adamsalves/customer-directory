<script setup lang="ts">
import { DEFAULT_PER_PAGE } from '#shared/utils/listQuery'
import { RESULTS_ID } from '~/utils/resultsScroll'
import S from './index.module.scss'

// The first row of the grid is on screen at load: its images skip lazy loading and the first one,
// the likely LCP, gets high priority.
const EAGER_IMAGES = 4

const { query } = useListQuery()
const { data, status } = await useFetch('/api/customers', { query })
</script>

<template>
  <div>
    <AppBreadcrumb :items="[{ label: 'Home', to: '/customers' }, { label: 'Usuários' }]" />
    <h1 :class="S.Title" data-testid="customers__title--heading">Lista de clientes</h1>
    <ul
      v-if="status === 'pending'"
      :id="RESULTS_ID"
      aria-busy="true"
      aria-label="Carregando clientes"
      :class="S.List"
      data-testid="customers__skeleton--list"
    >
      <li v-for="index in DEFAULT_PER_PAGE" :key="index" :class="S.Item">
        <CustomerCardSkeleton />
      </li>
    </ul>
    <ul v-else-if="data" :id="RESULTS_ID" :class="S.List" data-testid="customers__list--list">
      <li v-for="(customer, index) in data.items" :key="customer.slug" :class="S.Item">
        <CustomerCard
          :customer="customer"
          :loading="index < EAGER_IMAGES ? 'eager' : 'lazy'"
          :fetchpriority="index === 0 ? 'high' : undefined"
        />
      </li>
    </ul>
    <!-- Outside the skeleton/list branches, so it stays mounted while the next page loads. The
         select and the arrows that stay links keep the focus; a page link loses it when it turns
         into the current-page span (#72). `data` holds the previous answer until then -->
    <PaginationNav v-if="data" :page="data.page" :total-pages="data.totalPages" />
  </div>
</template>
