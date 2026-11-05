<script setup lang="ts">
import S from './CustomerInfoSection.module.scss'

defineProps<{ heading: string }>()

// The heading names the section (aria-labelledby). useId is the same on the server and in the
// browser, and no two sections get the same one.
const headingId = useId()
</script>

<template>
  <section
    :aria-labelledby="headingId"
    :class="S.Section"
    data-testid="customer-info-section__root--section"
  >
    <h2 :id="headingId" :class="S.Heading" data-testid="customer-info-section__heading--heading">
      {{ heading }}
    </h2>
    <!-- The page puts the <div><dt><dd></div> pairs here -->
    <dl :class="S.List" data-testid="customer-info-section__list--list">
      <slot />
    </dl>
  </section>
</template>
