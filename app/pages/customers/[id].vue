<script setup lang="ts">
import S from './[id].module.scss'

// `[id]` is one segment, so one string: String() only settles the type, which also allows the list
// of a catch-all. Read once: Nuxt keys the page by its path, so another customer is another page.
const slug = String(useRoute().params.id)

// No retry of its own on a 502: a retry here would read the source twice and keep the answer off
// the screen twice as long (ADR-0005). The slug comes from the address, so it is encoded: a `../` in
// it cannot walk out of /api/customers/ to a route that answers with no customer (a 500, not a 404).
const { data, error } = await useFetch(`/api/customers/${encodeURIComponent(slug)}`, {
  retry: false,
})

// The status of the page is the one the BFF gave (404 for a slug that is no customer, 502 for the
// source down), and `fatal` takes the whole screen. The error page itself is #34.
if (error.value || !data.value) {
  throw createError({
    status: error.value?.status ?? 500,
    statusText: error.value?.statusText,
    fatal: true,
  })
}
const { customer } = data.value
// The template names the article by the heading of the hero (id "customer-name", in CustomerHero)
</script>

<template>
  <article
    aria-labelledby="customer-name"
    :class="S.Article"
    data-testid="customer-detail__root--article"
  >
    <CustomerHero :customer="customer" />
  </article>
</template>
