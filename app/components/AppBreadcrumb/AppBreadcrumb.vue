<script setup lang="ts">
import S from './AppBreadcrumb.module.scss'

// `to` is the target of an intermediate step; the last item is always the current page.
export interface IBreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  items: IBreadcrumbItem[]
  hideOnMobile?: boolean
}>()
</script>

<template>
  <nav
    aria-label="Trilha de navegação"
    :class="[S.Breadcrumb, hideOnMobile && S.HideOnMobile]"
    data-testid="breadcrumb__trail--nav"
  >
    <ol :class="S.List">
      <li v-for="(item, index) in items" :key="item.label" :class="S.Item">
        <span v-if="index > 0" aria-hidden="true" data-testid="breadcrumb__separator--text">
          &gt;
        </span>
        <span
          v-if="index === items.length - 1"
          aria-current="page"
          data-testid="breadcrumb__item--current"
        >
          {{ item.label }}
        </span>
        <NuxtLink
          v-else-if="item.to"
          :to="item.to"
          :class="S.Link"
          data-testid="breadcrumb__item--link"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else>{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
