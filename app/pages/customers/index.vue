<script setup lang="ts">
import S from './index.module.scss'
</script>

<template>
  <div>
    <AppBreadcrumb :items="[{ label: 'Home', to: '/customers' }, { label: 'Usuários' }]" />
    <h1 :class="S.Title" data-testid="customers__title--heading">Lista de clientes</h1>
  </div>
</template>
