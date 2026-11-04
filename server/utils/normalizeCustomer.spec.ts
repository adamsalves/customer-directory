// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ICustomer, IRawCustomer } from '#shared/types/customer'
import customers from '../../tests/fixtures/customers.json'
import { normalizeCustomer } from './normalizeCustomer'
import { parseRawCustomers } from './parseRawCustomers'

type TTextField = 'name' | 'firstName' | 'lastName' | 'street' | 'city'
type TFixtureText = { index: number; field: TTextField; expected: string }
type TEditedText = { field: 'street' | 'city'; value: string; expected: string }

const raws = parseRawCustomers(customers)

// A copy of fixture record `index`, so a test can edit it
function rawAt(index: number): IRawCustomer {
  const record = raws[index]
  if (!record) throw new Error(`no fixture record at index ${String(index)}`)
  return structuredClone(record)
}

// Record 0 (or `index`) after `edit`, normalized
function normalizeEdited(edit: (raw: IRawCustomer) => void, index = 0): ICustomer {
  const raw = rawAt(index)
  edit(raw)
  return normalizeCustomer(raw)
}

// Text rules seen on the fixture: lowercase particles, numerals, d', street reorder
const fixtureText: TFixtureText[] = [
  { index: 1, field: 'name', expected: 'Armando da Cruz' },
  { index: 12, field: 'name', expected: 'Alcindo das Neves' },
  { index: 11, field: 'firstName', expected: 'Girão' },
  // A surname that opens with a particle keeps it lowercase, as in the name
  { index: 1, field: 'lastName', expected: 'da Cruz' },
  { index: 12, field: 'lastName', expected: 'das Neves' },
  { index: 18, field: 'city', expected: 'Caxias do Sul' },
  { index: 19, field: 'city', expected: 'Angra dos Reis' },
  { index: 11, field: 'street', expected: 'Rua da Saudade, 3438' },
  { index: 10, field: 'street', expected: 'Rua Dezesseis de Maio, 2528' },
  { index: 13, field: 'street', expected: 'Rua Vinte e Quatro de Outubro, 2505' },
  { index: 14, field: 'street', expected: 'Avenida D. Pedro II, 791' },
  { index: 16, field: 'street', expected: 'Rua Dom Pedro II, 9513' },
  { index: 15, field: 'city', expected: "Santa Bárbara d'Oeste" },
]

// Text rules the fixture does not reach, so the record is edited
const editedText: TEditedText[] = [
  { field: 'city', value: 'ji-paraná', expected: 'Ji-Paraná' },
  { field: 'city', value: 'da serra', expected: 'Da Serra' },
  { field: 'city', value: '  são   PAULO ', expected: 'São Paulo' },
  { field: 'street', value: '167 rua joão xxiii', expected: 'Rua João XXIII, 167' },
  { field: 'street', value: '1 rua dom pedro iii', expected: 'Rua Dom Pedro III, 1' },
  { field: 'street', value: '1 rua dom pedro iv', expected: 'Rua Dom Pedro IV, 1' },
  { field: 'street', value: '5 ii avenida', expected: 'Ii Avenida, 5' },
  { field: 'street', value: '1 rua ivo livramento lviv', expected: 'Rua Ivo Livramento Lviv, 1' },
  { field: 'street', value: '  3833 rua santa catarina ', expected: 'Rua Santa Catarina, 3833' },
  { field: 'street', value: 'rua 7 de setembro', expected: 'Rua 7 de Setembro' },
  { field: 'street', value: '2a travessa', expected: '2a Travessa' },
]

describe('normalizeCustomer', () => {
  it('turns a raw record into what the UI renders', () => {
    expect(normalizeCustomer(rawAt(0))).toEqual({
      slug: 'alejandra-rodrigues',
      name: 'Alejandra Rodrigues',
      firstName: 'Alejandra',
      lastName: 'Rodrigues',
      street: 'Rua Santa Catarina, 3833',
      city: 'Umuarama',
      state: 'Santa Catarina',
      uf: 'SC',
      postcode: '43646',
      picture: 'https://randomuser.me/api/portraits/women/18.jpg',
      stateSlug: 'santa-catarina',
      title: 'Sra.',
      gender: 'female',
      email: 'alejandra.rodrigues@example.com',
      phone: '(09) 7033-7406',
      cell: '(54) 3190-3469',
      timezone: 'UTC+3:00 · Baghdad, Riyadh, Moscow, St. Petersburg',
      birthDate: '1974-05-16T14:46:15Z',
      registeredAt: '2013-03-06T16:09:16Z',
    })
  })

  it.each(fixtureText)('writes $field of record $index as "$expected"', (row) => {
    expect(normalizeCustomer(rawAt(row.index))[row.field]).toBe(row.expected)
  })

  // The source can send an empty first name: the particle stays lowercase in `name` too
  it('keeps the name equal to its parts when the first name is empty', () => {
    const customer = normalizeEdited((raw) => {
      raw.name.first = ''
    }, 1)

    expect(customer).toMatchObject({ name: 'da Cruz', firstName: '', lastName: 'da Cruz' })
  })

  it.each(editedText)('writes $field "$value" as "$expected"', ({ field, value, expected }) => {
    const customer = normalizeEdited((raw) => {
      raw.location[field] = value
    })

    expect(customer[field]).toBe(expected)
  })

  it.each([
    { title: 'mr', expected: 'Sr.' },
    { title: 'mrs', expected: 'Sra.' },
    { title: 'ms', expected: 'Sra.' },
    { title: 'miss', expected: 'Srta.' },
  ] as const)('maps the title $title to $expected', ({ title, expected }) => {
    const customer = normalizeEdited((raw) => {
      raw.name.title = title
    })

    expect(customer.title).toBe(expected)
  })

  it.each([
    { state: 'paraná', name: 'Paraná', uf: 'PR', stateSlug: 'parana' },
    {
      state: 'mato grosso do sul',
      name: 'Mato Grosso do Sul',
      uf: 'MS',
      stateSlug: 'mato-grosso-do-sul',
    },
    { state: ' SÃO Paulo ', name: 'São Paulo', uf: 'SP', stateSlug: 'sao-paulo' },
    { state: 'sao  paulo', name: 'São Paulo', uf: 'SP', stateSlug: 'sao-paulo' },
    { state: 'espirito santo', name: 'Espírito Santo', uf: 'ES', stateSlug: 'espirito-santo' },
    { state: 'atlantis', name: 'Atlantis', uf: '', stateSlug: 'atlantis' },
  ])(
    'resolves the state "$state" to $name with UF "$uf" and slug "$stateSlug"',
    ({ state, name, uf, stateSlug }) => {
      const customer = normalizeEdited((raw) => {
        raw.location.state = state
      })

      expect(customer.state).toBe(name)
      expect(customer.uf).toBe(uf)
      expect(customer.stateSlug).toBe(stateSlug)
    },
  )

  it.each([
    { index: 12, timezone: 'UTC-3:00 · Brazil, Buenos Aires, Georgetown' },
    { index: 17, timezone: 'UTC+0:00 · Western Europe Time, London, Lisbon, Casablanca' },
  ])('writes the timezone of record $index as "$timezone"', ({ index, timezone }) => {
    expect(normalizeCustomer(rawAt(index)).timezone).toBe(timezone)
  })

  it.each([
    { email: 'eleutério.almeida@example.com', slug: 'eleuterio-almeida' },
    { email: 'girão.darosa@example.com', slug: 'girao-darosa' },
    { email: 'luísa.aragão@example.com', slug: 'luisa-aragao' },
    { email: 'abraim.dacosta@example.com', slug: 'abraim-dacosta' },
    { email: 'ana.maria.souza@example.com', slug: 'ana-maria-souza' },
    { email: 'Ana..Silva.@example.com', slug: 'ana-silva' },
    { email: 'a/b?c#d@example.com', slug: 'a-b-c-d' },
  ])('turns $email into the slug $slug', ({ email, slug }) => {
    const customer = normalizeEdited((raw) => {
      raw.email = email
    })

    expect(customer.slug).toBe(slug)
  })

  it('gives every fixture record a different slug', () => {
    const slugs = raws.map((raw) => normalizeCustomer(raw).slug)

    expect(new Set(slugs).size).toBe(raws.length)
  })
})
