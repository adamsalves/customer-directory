<script setup lang="ts">
import S from './AppThemeToggle.module.scss'

const { theme, setTheme } = useTheme()

const isDark = computed(() => theme.value === 'dark')
// The label names the action and flips with the theme, so the button has no aria-pressed: the APG
// says a toggle's label must not change with its state, and in the dark theme a screen reader
// would announce "Ativar tema claro, pressed" (ADR-0013).
const label = computed(() => (isDark.value ? 'Ativar tema claro' : 'Ativar tema escuro'))
</script>

<template>
  <button
    type="button"
    :class="S.Toggle"
    :aria-label="label"
    :title="label"
    data-testid="header__theme--toggle"
    @click="setTheme(isDark ? 'light' : 'dark')"
  >
    <!-- Both icons are always in the HTML: CSS shows the one for [data-theme], so the server
         HTML and the first paint agree (ADR-0011) -->
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
      :class="S.Moon"
    >
      <path d="M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2z"></path>
    </svg>
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      :class="S.Sun"
    >
      <circle cx="12" cy="12" r="4.2"></circle>
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M5.3 18.7l1.55-1.55M17.15 6.85l1.55-1.55"
      ></path>
    </svg>
  </button>
</template>
