// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import customers from '../../tests/fixtures/customers.json'
import { parseRawCustomers } from './parseRawCustomers'
import { InvalidPayloadError } from './sourceFailure'

type TFixtureRecord = (typeof customers.results)[number]
type TStringFieldCase = { path: string; parent: (record: TFixtureRecord) => object; key: string }
type TWrongValueCase = { label: string; change: (record: TFixtureRecord) => unknown }

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

// Clone `record` and apply `edit` to the object that holds the field
function withField(
  record: TFixtureRecord,
  { parent }: TStringFieldCase,
  edit: (o: object) => void,
) {
  const clone = structuredClone(record)
  edit(parent(clone))
  return clone
}

// Every string leaf the guard checks; each must be rejected when missing and when not a string
const stringFields: TStringFieldCase[] = [
  { path: 'email', parent: (r) => r, key: 'email' },
  { path: 'phone', parent: (r) => r, key: 'phone' },
  { path: 'cell', parent: (r) => r, key: 'cell' },
  { path: 'name.first', parent: (r) => r.name, key: 'first' },
  { path: 'name.last', parent: (r) => r.name, key: 'last' },
  { path: 'location.street', parent: (r) => r.location, key: 'street' },
  { path: 'location.city', parent: (r) => r.location, key: 'city' },
  { path: 'location.state', parent: (r) => r.location, key: 'state' },
  { path: 'timezone.offset', parent: (r) => r.location.timezone, key: 'offset' },
  { path: 'timezone.description', parent: (r) => r.location.timezone, key: 'description' },
  { path: 'dob.date', parent: (r) => r.dob, key: 'date' },
  { path: 'registered.date', parent: (r) => r.registered, key: 'date' },
  { path: 'picture.large', parent: (r) => r.picture, key: 'large' },
]

const wrongValues: TWrongValueCase[] = [
  {
    label: 'a string postcode',
    change: (record) => ({ ...record, location: { ...record.location, postcode: '12345' } }),
  },
  {
    label: 'a decimal postcode',
    change: (record) => ({ ...record, location: { ...record.location, postcode: 12345.67 } }),
  },
  {
    label: 'an infinite postcode',
    change: (record) => ({ ...record, location: { ...record.location, postcode: Infinity } }),
  },
  {
    label: 'an invalid dob.date',
    change: (record) => ({ ...record, dob: { date: 'not-a-date' } }),
  },
  {
    label: 'an invalid registered.date',
    change: (record) => ({ ...record, registered: { date: 'not-a-date' } }),
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

  it.each(stringFields)('drops a record without $path', (field) => {
    expectBadRecordDropped(
      payloadWithBadRecord((record) =>
        withField(record, field, (o) => Reflect.deleteProperty(o, field.key)),
      ),
    )
  })

  it.each(stringFields)('drops a record with a number in $path', (field) => {
    expectBadRecordDropped(
      payloadWithBadRecord((record) =>
        withField(record, field, (o) => Reflect.set(o, field.key, 42)),
      ),
    )
  })

  it.each(wrongValues)('drops a record with $label', ({ change }) => {
    expectBadRecordDropped(payloadWithBadRecord(change))
  })

  it('drops records that are not objects or have a non-object branch', () => {
    const [valid] = customers.results
    const warn = silenceWarn()

    const result = parseRawCustomers({
      results: [
        null,
        'x',
        [],
        { ...valid, name: null },
        { ...valid, location: { ...valid?.location, timezone: 'x' } },
        valid,
      ],
    })

    expect(result).toEqual([valid])
    expect(warn).toHaveBeenCalledTimes(5)
  })

  it('throws when every record is invalid', () => {
    silenceWarn()

    const payload = { results: customers.results.map((record) => ({ ...record, gender: 'other' })) }

    expect(() => parseRawCustomers(payload)).toThrow('no valid record')
    expect(() => parseRawCustomers(payload)).toThrow(InvalidPayloadError)
  })

  // An empty list would replace the cached one and show no customers for an hour (PR #65 review)
  it('throws when the source is empty', () => {
    expect(() => parseRawCustomers({ results: [] })).toThrow('no valid record')
    expect(() => parseRawCustomers({ results: [] })).toThrow(InvalidPayloadError)
  })

  it.each([
    { payload: null },
    { payload: 'x' },
    { payload: [] },
    { payload: {} },
    { payload: { results: 'x' } },
  ])('throws when the payload is $payload', ({ payload }) => {
    expect(() => parseRawCustomers(payload)).toThrow('Invalid customers payload')
    expect(() => parseRawCustomers(payload)).toThrow(InvalidPayloadError)
  })
})
