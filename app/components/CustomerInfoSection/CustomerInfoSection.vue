<script setup lang="ts">
import S from './CustomerInfoSection.module.scss'

// `id` is the heading's, which names the section (aria-labelledby): a prop, so that it lands on the
// heading and not on the root
defineProps<{ heading: string; id: string }>()
</script>

<template>
  <section
    :aria-labelledby="id"
    :class="S.Section"
    data-testid="customer-info-section__root--section"
  >
    <h2 :id="id" :class="S.Heading" data-testid="customer-info-section__heading--heading">
      {{ heading }}
    </h2>
    <!-- The page puts the <div><dt><dd></div> pairs here -->
    <dl :class="S.List" data-testid="customer-info-section__list--list">
      <slot />
    </dl>
  </section>
</template>
