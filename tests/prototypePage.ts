import { readFileSync } from 'node:fs'

// The prototype bundle keeps the page as a JSON string in <script type="__bundler/template">.
// Specs read it here, instead of a copied list, so any drift from the prototype fails them.
export function prototypePage(): string {
  const html = readFileSync(
    new URL('../docs/design/diretorio-de-membros.html', import.meta.url),
    'utf8',
  )
  const raw = /<script type="__bundler\/template">([\s\S]*?)<\/script>/.exec(html)?.[1]
  if (raw === undefined) throw new Error('template not found in the prototype bundle')
  const page: unknown = JSON.parse(raw)
  if (typeof page !== 'string') throw new Error('prototype template is not a string')
  return page
}
