<script setup lang="ts">
import S from './index.module.scss'

// The first row of the grid is on screen at load: its images skip lazy loading and the first one,
// the likely LCP, gets high priority.
const EAGER_IMAGES = 4

const { query } = useListQuery()
const { data } = await useFetch('/api/customers', { query })
</script>

<template>
  <div>
    <AppBreadcrumb :items="[{ label: 'Home', to: '/customers' }, { label: 'Usuários' }]" />
    <h1 :class="S.Title" data-testid="customers__title--heading">Lista de clientes</h1>
    <ul v-if="data" :class="S.List" data-testid="customers__list--list">
      <li v-for="(customer, index) in data.items" :key="customer.slug" :class="S.Item">
        <CustomerCard
          :customer="customer"
          :loading="index < EAGER_IMAGES ? 'eager' : 'lazy'"
          :fetchpriority="index === 0 ? 'high' : undefined"
        />
      </li>
    </ul>
  </div>
</template>
