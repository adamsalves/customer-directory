// Only the fields the app reads. The source has more (coordinates, picture.medium/thumbnail,
// dob.age, registered.age); they are neither validated nor typed.
export interface IRawCustomer {
  gender: 'male' | 'female'
  name: { title: 'mr' | 'mrs' | 'ms' | 'miss'; first: string; last: string }
  location: {
    street: string
    city: string
    state: string
    postcode: number
    timezone: { offset: string; description: string }
  }
  email: string
  phone: string
  cell: string
  dob: { date: string }
  registered: { date: string }
  picture: { large: string }
}

export interface ICustomerCard {
  slug: string
  name: string
  street: string
  city: string
  state: string
  uf: string
  postcode: string
  picture: string
}

export interface ICustomer extends ICustomerCard {
  title: 'Sr.' | 'Sra.' | 'Srta.'
  gender: 'male' | 'female'
  email: string
  phone: string
  cell: string
  timezone: string
  birthDate: string // ISO 8601
  age: number
  registeredAt: string // ISO 8601
}

export interface ICustomerListResponse {
  items: ICustomerCard[]
  total: number
  page: number
  perPage: number
  totalPages: number
}
