<script setup lang="ts">
import S from './index.module.scss'

// English file path, pt-BR public path (ADR-0017, ADR-0020)
definePageMeta({ path: '/clientes' })
</script>

<template>
  <div>
    <AppBreadcrumb :items="[{ label: 'Home', to: '/clientes' }, { label: 'Usuários' }]" />
    <h1 :class="S.Title" data-testid="customers__title--heading">Lista de clientes</h1>
  </div>
</template>
