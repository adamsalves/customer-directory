<script setup lang="ts">
import type { NuxtError } from '#app'
import S from './error.module.scss'

const props = defineProps<{ error: NuxtError }>()

// Only a 404 is a link gone stale. Any other (the source down, a bug) is not the link's fault, and
// "try again" is the honest advice.
const notFound = computed(() => props.error.status === 404)
const heading = computed(() => (notFound.value ? 'Cliente não encontrado' : 'Algo deu errado'))
const text = computed(() =>
  notFound.value
    ? 'O link pode estar desatualizado ou o cliente não existe mais.'
    : 'Não foi possível abrir esta página. Tente novamente em instantes.',
)

// The title says which error this is: a screen reader does not announce an alert that is already in
// the HTML of a page load, but it reads the title
useSeoMeta({ title: () => `${heading.value} · Juntos Somos Mais` })

// The h1 is slot content of <NuxtLayout>, where useTemplateRef does not resolve its type: an
// explicitly typed ref keeps it honest
const titleRef = ref<HTMLHeadingElement | null>(null)

// A view replaced in the middle of an SPA navigation leaves the focus on <body> (a direct URL access
// starts there too): on mount the h1 takes it, so the keyboard and the screen reader have an entry
// point in the page (ADR-0024)
onMounted(() => titleRef.value?.focus())
</script>

<template>
  <!-- app.vue does not render on an error, and the layout is rendered there: asking for it here
       brings back the header, the theme toggle and the toast -->
  <NuxtLayout>
    <div :class="S.ErrorPage" data-testid="error-page__root--div">
      <!-- The alert is the message only: the link is no part of what is announced -->
      <div role="alert" :class="S.Message" data-testid="error-page__message--alert">
        <h1 ref="titleRef" tabindex="-1" :class="S.Title" data-testid="error-page__title--heading">
          {{ heading }}
        </h1>
        <p :class="S.Text" data-testid="error-page__text--paragraph">{{ text }}</p>
      </div>
      <!-- A navigation that lands clears the error (the router plugin of Nuxt), so no clearError -->
      <NuxtLink to="/customers" :class="S.Link" data-testid="error-page__list--link">
        Ver lista de clientes
      </NuxtLink>
    </div>
  </NuxtLayout>
</template>
