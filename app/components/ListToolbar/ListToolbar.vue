<script setup lang="ts">
import type { AsyncDataRequestStatus } from '#app'
import type { ICustomerListResponse } from '#shared/types/customer'
import { TOOLBAR_ID } from '~/utils/resultsScroll'
import S from './ListToolbar.module.scss'

// `response` is the BFF answer: the last one while the next is on its way, as the counts of the panel
// do, and none after a failed one. page and perPage come from it, already clamped, never from the URL.
const props = defineProps<{
  response: ICustomerListResponse | undefined
  status: AsyncDataRequestStatus
}>()

// "Exibindo X–Y de N clientes" (ADR-0020). A failure leaves the text empty: the error state announces
// itself with role="alert", and a second voice would say it twice (ADR-0013).
const text = computed(() => {
  const { response, status } = props
  if (status === 'pending') return 'Carregando clientes…'
  if (status === 'error' || !response) return ''
  const { items, total, page, perPage } = response
  if (total === 0) return 'Nenhum cliente encontrado'
  const start = (page - 1) * perPage
  const range = `${String(start + 1)}–${String(start + items.length)}`
  return `Exibindo ${range} de ${String(total)} ${total === 1 ? 'cliente' : 'clientes'}`
})
</script>

<template>
  <div :id="TOOLBAR_ID" :class="S.Toolbar" data-testid="list-toolbar__root--div">
    <!-- The one live region of the list, in the HTML for every state and width: only its text
         changes, which is what a screen reader announces -->
    <p role="status" aria-live="polite" :class="S.Count" data-testid="list-toolbar__count--text">
      {{ text }}
    </p>
    <!-- The card holds the sort select from 960px; below it the select is in the bar of the sheet -->
    <SortSelect variant="card" />
  </div>
</template>
