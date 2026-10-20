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
      <!-- The position is the step's identity: labels may repeat, the trail never reorders -->
      <li
        v-for="(item, index) in items"
        :key="index"
        :class="S.Item"
        data-testid="breadcrumb__step--item"
      >
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
        <!-- RouterLink marks an exact-active link as the current page (Home on /customers);
             in a trail only the last step is current -->
        <NuxtLink
          v-else-if="item.to"
          :to="item.to"
          aria-current-value="false"
          :class="S.Link"
          data-testid="breadcrumb__item--link"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else data-testid="breadcrumb__item--text">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
