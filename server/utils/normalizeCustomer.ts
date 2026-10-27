import type { ICustomer, IRawCustomer } from '#shared/types/customer'
import { BRAZILIAN_STATES } from '#shared/utils/brazilianStates'
import { foldText } from './foldText'

const TITLES: Record<IRawCustomer['name']['title'], ICustomer['title']> = {
  mr: 'Sr.',
  mrs: 'Sra.',
  ms: 'Sra.',
  miss: 'Srta.',
}

const LOWER = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
// ponytail: closed list from the prototype, valid while the source is static;
// widen to a numeral regex if new data brings others.
const ROMAN = /^(ii|iii|iv|xxiii)$/

const capitalize = (word: string) =>
  word
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-')

// "caxias do sul" -> "Caxias do Sul"; particles and numerals only after the first word
function titleCase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && LOWER.has(word)) return word
      if (index > 0 && ROMAN.test(word)) return word.toUpperCase()
      if (word.startsWith("d'")) return `d'${capitalize(word.slice(2))}`
      return capitalize(word)
    })
    .join(' ')
}

// "3833 rua santa catarina " -> "Rua Santa Catarina, 3833"; no leading number: only title-cased
function formatStreet(street: string): string {
  const [, streetNumber, streetName] = /^(\d+)\s+(.*)$/.exec(street.trim()) ?? []
  return streetNumber === undefined || streetName === undefined
    ? titleCase(street)
    : `${titleCase(streetName)}, ${streetNumber}`
}

// The prototype's slug(): "Eleutério.Almeida" -> "eleuterio-almeida", "são  paulo" -> "sao-paulo".
// Only [a-z0-9-] survives, so the URL stays ASCII (ADR-0006).
function slugify(text: string): string {
  return foldText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Full years on UTC dates: the source dates are UTC
function yearsSince(iso: string, now: Date): number {
  const date = new Date(iso)
  const years = now.getUTCFullYear() - date.getUTCFullYear()
  const months = now.getUTCMonth() - date.getUTCMonth()
  const birthdayPending = months < 0 || (months === 0 && now.getUTCDate() < date.getUTCDate())
  return birthdayPending ? years - 1 : years
}

// "0:00" -> "UTC+0:00": the source drops the sign of a zero offset
function formatTimezone({ offset, description }: IRawCustomer['location']['timezone']): string {
  const sign = offset.startsWith('-') || offset.startsWith('+') ? '' : '+'
  return `UTC${sign}${offset} · ${description}`
}

// Raw record (lowercase, no id) -> what the UI renders (ADR-0004); slug from the email (ADR-0006).
export function normalizeCustomer(raw: IRawCustomer, now = new Date()): ICustomer {
  const { name, location } = raw
  const stateSlug = slugify(location.state)
  const state = BRAZILIAN_STATES.find(({ slug }) => slug === stateSlug)
  return {
    slug: slugify(raw.email.replace(/@.*$/, '')),
    name: titleCase(`${name.first} ${name.last}`),
    street: formatStreet(location.street),
    city: titleCase(location.city),
    state: state?.name ?? titleCase(location.state),
    uf: state?.uf ?? '',
    postcode: String(location.postcode),
    picture: raw.picture.large,
    stateSlug,
    title: TITLES[name.title],
    gender: raw.gender,
    email: raw.email,
    phone: raw.phone,
    cell: raw.cell,
    timezone: formatTimezone(location.timezone),
    birthDate: raw.dob.date,
    age: yearsSince(raw.dob.date, now),
    registeredAt: raw.registered.date,
  }
}
