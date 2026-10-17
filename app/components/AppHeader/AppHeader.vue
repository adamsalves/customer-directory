<script setup lang="ts">
import S from './AppHeader.module.scss'
</script>

<template>
  <header :class="S.Header">
    <div :class="S.Inner">
      <NuxtLink
        to="/clientes"
        aria-label="Juntos Somos Mais — início"
        aria-current-value="false"
        :class="S.Logo"
        data-testid="header__logo--link"
      >
        <img
          src="/logo.png"
          alt="Juntos Somos Mais"
          width="49"
          height="56"
          :class="S.LogoImage"
          data-testid="header__logo--image"
        />
      </NuxtLink>
    </div>
  </header>
</template>
