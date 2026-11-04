import { parseListQuery } from '#shared/utils/listQuery'
import { loadCustomers } from '../utils/loadCustomers'
import { queryCustomers } from '../utils/queryCustomers'

export default defineEventHandler(async (event) => {
  const customers = await loadCustomers()
  return queryCustomers(customers, parseListQuery(getQuery(event)))
})
