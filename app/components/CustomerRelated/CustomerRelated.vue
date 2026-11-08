<script setup lang="ts">
import type { ICustomerCard } from '#shared/types/customer'
import { serializeListQuery } from '#shared/utils/listQuery'
import { BRAZILIAN_STATES } from '#shared/utils/brazilianStates'
import S from './CustomerRelated.module.scss'

// The answer lists the others of the customer's state: up to 4, by name, the customer left out.
// `state` is what the heading writes, and `stateSlug` is the filter the link to the list carries.
const props = defineProps<{
  customers: ICustomerCard[]
  state: string
  stateSlug: string
}>()

// The list state of the address: each card opens the customer with it, the way the card's link
// opened this page. Nothing is written in flight on the detail, so there is no pending() to carry.
const { query } = useListQuery()

function to(card: ICustomerCard) {
  return { path: `/customers/${card.slug}`, query: serializeListQuery(query.value) }
}

// The link goes to the list of the state alone: the search and the gender come out and the page
// starts over, the order and the page size stay. Defaults stay out of the URL.
const allOfTheState = computed(() => ({
  path: LIST_PATH,
  query: serializeListQuery({
    ...query.value,
    search: '',
    gender: 'all',
    states: [props.stateSlug],
    page: 1,
  }),
}))

// The heading names the section (aria-labelledby). useId is the same on the server and in the
// browser, and no two sections get the one of another
const headingId = useId()

// A state outside the 27 is grouped by its own slug by the BFF, but its filter is not in the public
// URL (the parser takes the slugs of the table only): the link would go to the whole list while
// promising the state. The cards keep their value; only the link to the list is out.
const stateIsInTable = computed(() => BRAZILIAN_STATES.some(({ slug }) => slug === props.stateSlug))
</script>

<template>
  <!-- The state has no other one: nothing at all, the `hasRelated` the prototype keeps -->
  <section
    v-if="customers.length > 0"
    :aria-labelledby="headingId"
    :class="S.Section"
    data-testid="customer-related__root--section"
  >
    <div :class="S.Header" data-testid="customer-related__header--div">
      <h2 :id="headingId" :class="S.Title" data-testid="customer-related__title--heading">
        Outros clientes em {{ state }}
      </h2>
      <NuxtLink
        v-if="stateIsInTable"
        :to="allOfTheState"
        :class="S.More"
        data-testid="customer-related__more--link"
      >
        Ver todos de {{ state }}
      </NuxtLink>
    </div>
    <ul :class="S.Cards" data-testid="customer-related__cards--list">
      <!-- From 640px one row of cards; below it, the row scrolls sideways and the cards snap: the
           links of the cards are the way through, and the browser scrolls the focused one into view -->
      <li
        v-for="card in customers"
        :key="card.slug"
        :class="S.Item"
        data-testid="customer-related__item--listitem"
      >
        <div :class="S.Card" data-testid="customer-related__card--div">
          <CustomerAvatar
            :src="card.picture"
            :name="card.name"
            alt=""
            :size="64"
            :class="S.Avatar"
          />
          <!-- The name is the link, as in the list cards (ADR-0013), and its ::after is the card:
               the card takes the click, and a reader lists the customers by the name -->
          <p :class="S.Name" data-testid="customer-related__name--text">
            <NuxtLink :to="to(card)" :class="S.Link" data-testid="customer-related__name--link">{{
              card.name
            }}</NuxtLink>
          </p>
          <p :class="S.City" data-testid="customer-related__city--text">{{ card.city }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>
