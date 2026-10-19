// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import customers from '../../tests/fixtures/customers.json'
import { parseRawCustomers } from './parseRawCustomers'

type TFixtureRecord = (typeof customers.results)[number]
type TRequiredFieldCase = { path: string; drop: (record: TFixtureRecord) => boolean }
type TWrongTypeCase = { label: string; change: (record: TFixtureRecord) => unknown }

// The record the tests break; any index would do
const BAD_INDEX = 5

function silenceWarn() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

// The fixture payload with one record replaced by `change(record)`
function payloadWithBadRecord(change: (record: TFixtureRecord) => unknown) {
  return {
    results: customers.results.map((record, index) =>
      index === BAD_INDEX ? change(record) : record,
    ),
  }
}

// Only the bad record goes away, the rest keeps its order, and the drop is logged with its index
function expectBadRecordDropped(payload: unknown) {
  const warn = silenceWarn()

  const result = parseRawCustomers(payload)

  expect(result).toEqual(customers.results.filter((_, index) => index !== BAD_INDEX))
  expect(warn).toHaveBeenCalledOnce()
  expect(warn).toHaveBeenCalledWith(expect.stringContaining(`index ${String(BAD_INDEX)}`))
}

// Every string leaf the guard checks; removing one must drop the record
const requiredFields: TRequiredFieldCase[] = [
  { path: 'email', drop: (r) => Reflect.deleteProperty(r, 'email') },
  { path: 'phone', drop: (r) => Reflect.deleteProperty(r, 'phone') },
  { path: 'cell', drop: (r) => Reflect.deleteProperty(r, 'cell') },
  { path: 'name.first', drop: (r) => Reflect.deleteProperty(r.name, 'first') },
  { path: 'name.last', drop: (r) => Reflect.deleteProperty(r.name, 'last') },
  { path: 'location.street', drop: (r) => Reflect.deleteProperty(r.location, 'street') },
  { path: 'location.city', drop: (r) => Reflect.deleteProperty(r.location, 'city') },
  { path: 'location.state', drop: (r) => Reflect.deleteProperty(r.location, 'state') },
  { path: 'timezone.offset', drop: (r) => Reflect.deleteProperty(r.location.timezone, 'offset') },
  {
    path: 'timezone.description',
    drop: (r) => Reflect.deleteProperty(r.location.timezone, 'description'),
  },
  { path: 'dob.date', drop: (r) => Reflect.deleteProperty(r.dob, 'date') },
  { path: 'registered.date', drop: (r) => Reflect.deleteProperty(r.registered, 'date') },
  { path: 'picture.large', drop: (r) => Reflect.deleteProperty(r.picture, 'large') },
]

const wrongTypes: TWrongTypeCase[] = [
  {
    label: 'a string postcode',
    change: (record) => ({ ...record, location: { ...record.location, postcode: '12345' } }),
  },
  { label: 'an unknown gender', change: (record) => ({ ...record, gender: 'other' }) },
  {
    label: 'an unknown title',
    change: (record) => ({ ...record, name: { ...record.name, title: 'dr' } }),
  },
]

describe('parseRawCustomers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts the whole fixture without warnings', () => {
    const warn = silenceWarn()

    const result = parseRawCustomers(customers)

    expect(result).toHaveLength(20)
    expect(result).toEqual(customers.results)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(requiredFields)('drops a record without $path', ({ drop }) => {
    expectBadRecordDropped(
      payloadWithBadRecord((record) => {
        const clone = structuredClone(record)
        drop(clone)
        return clone
      }),
    )
  })

  it.each(wrongTypes)('drops a record with $label', ({ change }) => {
    expectBadRecordDropped(payloadWithBadRecord(change))
  })

  it.each([
    { payload: null },
    { payload: 'x' },
    { payload: [] },
    { payload: {} },
    { payload: { results: 'x' } },
  ])('throws when the payload is $payload', ({ payload }) => {
    expect(() => parseRawCustomers(payload)).toThrow('Invalid customers payload')
  })
})
