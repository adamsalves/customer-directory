<script setup lang="ts">
import type { ICustomer } from '#shared/types/customer'
import { yearsSince } from '#shared/utils/yearsSince'
import { GENDERS } from '~/utils/genders'
import S from './CustomerHero.module.scss'

const props = defineProps<{ customer: ICustomer }>()

// Counted from the dates here, when the page renders: a count made by the BFF would stay frozen in
// the copy it caches (ADR-0005).
const kicker = computed(() => {
  const years = yearsSince(props.customer.registeredAt, new Date())
  return `${props.customer.title} · Cliente há ${String(years)} anos`
})

// The state's name stands in for a UF the source did not give, as in the card.
const tags = computed(() => {
  const { birthDate, gender, uf, state } = props.customer
  return [
    `${String(yearsSince(birthDate, new Date()))} anos`,
    GENDERS.find(({ value }) => value === gender)?.label ?? '—',
    uf || state,
  ]
})

// "(54) 3190-3469" -> "tel:+555431903469": with the country code the call works from any phone
const callHref = computed(() => `tel:+55${props.customer.cell.replace(/\D/g, '')}`)
</script>

<template>
  <section :class="S.Hero" data-testid="customer-hero__root--section">
    <!-- On screen at load and the likely LCP: no lazy loading and high priority, as the first card of
         the list (ADR-0013 has the row) -->
    <CustomerAvatar
      :src="customer.picture"
      :name="customer.name"
      :alt="`Foto de ${customer.name}`"
      :size="128"
      loading="eager"
      fetchpriority="high"
      :class="S.Avatar"
    />
    <div :class="S.Text" data-testid="customer-hero__text--div">
      <p :class="S.Kicker" data-testid="customer-hero__kicker--text">{{ kicker }}</p>
      <!-- The page's article is named by this heading (aria-labelledby) -->
      <h1 id="customer-name" :class="S.Name" data-testid="customer-hero__name--heading">
        {{ customer.name }}
      </h1>
      <p :class="S.Location" data-testid="customer-hero__location--text">
        {{ `${customer.city}, ${customer.state}` }}
      </p>
      <ul aria-label="Resumo" :class="S.Tags" data-testid="customer-hero__tags--list">
        <li v-for="tag in tags" :key="tag" :class="S.Tag" data-testid="customer-hero__tag--item">
          {{ tag }}
        </li>
      </ul>
    </div>
    <div :class="S.Actions" data-testid="customer-hero__actions--div">
      <a
        :href="`mailto:${customer.email}`"
        :class="[S.Action, S.Primary]"
        data-testid="customer-hero__email--link"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        >
          <rect x="3" y="5" width="18" height="14" rx="2"></rect>
          <path d="M3.5 6.5L12 13l8.5-6.5"></path>
        </svg>
        Enviar e-mail
      </a>
      <a :href="callHref" :class="[S.Action, S.Secondary]" data-testid="customer-hero__call--link">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        >
          <path
            d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"
          ></path>
        </svg>
        Ligar
      </a>
    </div>
  </section>
</template>
