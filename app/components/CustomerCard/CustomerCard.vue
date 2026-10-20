<script setup lang="ts">
import type { ICustomerCard } from '#shared/types/customer'
import S from './CustomerCard.module.scss'

withDefaults(
  defineProps<{
    customer: ICustomerCard
    loading?: 'eager' | 'lazy'
    fetchpriority?: 'high'
  }>(),
  { loading: 'lazy', fetchpriority: undefined },
)
</script>

<template>
  <article :class="S.Card" data-testid="customer-card__root--article">
    <span :class="S.Avatar">
      <img
        :src="customer.picture"
        alt=""
        width="80"
        height="80"
        decoding="async"
        :loading="loading"
        :fetchpriority="fetchpriority"
        :class="S.Image"
        data-testid="customer-card__avatar--image"
      />
    </span>
    <div :class="S.Text">
      <h2 :class="S.Name" data-testid="customer-card__name--heading">{{ customer.name }}</h2>
      <p :class="S.Street" data-testid="customer-card__street--text">{{ customer.street }}</p>
      <!-- Two lines in the grid, one in the row. CSS shows one of the two: display:none also keeps
           the other out of the accessibility tree, so nothing is read twice (ADR-0014) -->
      <p :class="S.LocationGrid" data-testid="customer-card__location--grid">
        <span data-testid="customer-card__city--text">{{ customer.city }}</span>
        <span data-testid="customer-card__state--text">
          {{ `${customer.state} - CEP: ${customer.postcode}` }}
        </span>
      </p>
      <p :class="S.LocationRow" data-testid="customer-card__location--row">
        {{ `${customer.city}, ${customer.uf || customer.state} · CEP ${customer.postcode}` }}
      </p>
    </div>
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      :class="S.Chevron"
      data-testid="customer-card__chevron--icon"
    >
      <path d="M9 6l6 6-6 6"></path>
    </svg>
  </article>
</template>
