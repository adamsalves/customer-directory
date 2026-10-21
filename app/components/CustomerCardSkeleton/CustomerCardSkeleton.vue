<script setup lang="ts">
import S from './CustomerCardSkeleton.module.scss'
</script>

<template>
  <!-- Decorative: the list around it carries aria-busy and the label -->
  <div aria-hidden="true" :class="S.Skeleton" data-testid="customer-card-skeleton__root--block">
    <span :class="S.Avatar"></span>
    <span :class="S.Bars">
      <span :class="S.Name"></span>
      <span :class="S.Street"></span>
      <span :class="S.Location"></span>
    </span>
  </div>
</template>
