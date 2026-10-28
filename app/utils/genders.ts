import type { IListQuery } from '#shared/utils/listQuery'

// The genders of the filter, in the order the panel lists them. The chip of a picked gender takes
// its label from here too.
export const GENDERS = [
  { value: 'all', label: 'Todos' },
  { value: 'female', label: 'Feminino' },
  { value: 'male', label: 'Masculino' },
] as const satisfies readonly { value: IListQuery['gender']; label: string }[]
