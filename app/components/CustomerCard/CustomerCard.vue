<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { ICustomerCard } from '#shared/types/customer'
import S from './CustomerCard.module.scss'

// `to` is the customer's page, which carries the list state the page goes back to
withDefaults(
  defineProps<{
    customer: ICustomerCard
    to: RouteLocationRaw
    loading?: 'eager' | 'lazy'
    fetchpriority?: 'high'
  }>(),
  { loading: 'lazy', fetchpriority: undefined },
)
</script>

<template>
  <article :class="S.Card" data-testid="customer-card__root--article">
    <CustomerAvatar
      :src="customer.picture"
      :name="customer.name"
      alt=""
      :size="80"
      :loading="loading"
      :fetchpriority="fetchpriority"
      :class="S.Avatar"
    />
    <div :class="S.Text">
      <!-- The link is the name alone, so a reader lists the customers by name, and CSS stretches it
           over the whole card. Not an <a> around the article: Chrome gives that link no name. -->
      <h2 :class="S.Name" data-testid="customer-card__name--heading">
        <NuxtLink :to="to" :class="S.Link" data-testid="customer-card__name--link">{{
          customer.name
        }}</NuxtLink>
      </h2>
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
