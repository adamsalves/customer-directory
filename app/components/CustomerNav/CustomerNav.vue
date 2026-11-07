<script setup lang="ts">
import type { ICustomerCard } from '#shared/types/customer'
import { serializeListQuery } from '#shared/utils/listQuery'
import S from './CustomerNav.module.scss'

// position and total are the place of the customer (counted from 1) in the list the address
// carries, and the size of that context: what the BFF shaped around it. prev and next are the
// neighbors at either side, each of them null on the edges of that context.
defineProps<{
  position: number
  total: number
  prev: ICustomerCard | null
  next: ICustomerCard | null
}>()

// The list state of the address: each link opens the neighbor with it, the way the card's link
// opened this page. Nothing is written in flight on the detail, so there is no pending() to carry.
const { query } = useListQuery()

function to(card: ICustomerCard) {
  return { path: `/customers/${card.slug}`, query: serializeListQuery(query.value) }
}
</script>

<template>
  <!-- One marking for the two widths: the CSS places the position and the cards (ADR-0014). The
       name of each link comes from the content, "Anterior {name}" and "Próximo {name}". -->
  <nav aria-label="Navegar entre clientes" :class="S.Nav" data-testid="customer-nav__root--nav">
    <NuxtLink
      v-if="prev"
      :to="to(prev)"
      :class="[S.Link, S.Prev]"
      data-testid="customer-nav__prev--link"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" :class="S.Chevron">
        <path d="M15 6l-6 6 6 6"></path>
      </svg>
      <span :class="S.Text">
        <span :class="S.Label">Anterior</span>
        <span :class="S.Name">{{ prev.name }}</span>
      </span>
    </NuxtLink>
    <p :class="S.Position" data-testid="customer-nav__position--text">
      {{ position }} de {{ total }}
    </p>
    <NuxtLink
      v-if="next"
      :to="to(next)"
      :class="[S.Link, S.Next]"
      data-testid="customer-nav__next--link"
    >
      <span :class="S.Text">
        <span :class="S.Label">Próximo</span>
        <span :class="S.Name">{{ next.name }}</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24" :class="S.Chevron">
        <path d="M9 6l6 6-6 6"></path>
      </svg>
    </NuxtLink>
  </nav>
</template>
