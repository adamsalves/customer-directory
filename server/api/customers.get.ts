import { parseListQuery } from '#shared/utils/listQuery'
import { fetchCustomers } from '../utils/fetchCustomers'
import { queryCustomers } from '../utils/queryCustomers'

export default defineEventHandler(async (event) =>
  queryCustomers(await fetchCustomers(), parseListQuery(getQuery(event))),
)
