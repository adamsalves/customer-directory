// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The 48 custom properties of the v2 prototype (ADR-0013). Pinned here instead of derived from
// tokens.scss, so a rename or a dropped token in either theme fails the test.
const PROTOTYPE_TOKENS = `
  --bg --surface --header-bg --header-hover --surface-alt --border --border-subtle
  --border-strong --border-hover --input-border --input-bg --text-strong --text --text-muted
  --text-count --placeholder --icon-muted --link --link-hover --focus-ring --primary-bg
  --primary-bg-hover --primary-text --inverse-bg --inverse-text --accent --page-current
  --page-underline --disabled-bg --disabled-fg --muted-bg --skeleton --seg-active-bg
  --seg-active-text --toolbar-bg --footer-bg --footer-text --social-bg --overlay --shadow-card
  --shadow-sheet --shadow-toast --shadow-seg --warn-bg --warn-border --warn-text --logo-pill-bg
  --logo-pill-pad
`
  .trim()
  .split(/\s+/)

const LIGHT = /^:root\s*\{([^}]*)\}/m
const DARK = /^\[data-theme=['"]dark['"]\]\s*\{([^}]*)\}/m

const source = readFileSync(new URL('./tokens.scss', import.meta.url), 'utf8')

function tokenNames(block: RegExp): string[] {
  const body = block.exec(source)?.[1]
  if (body === undefined) throw new Error(`${block.source} not found in tokens.scss`)
  return Array.from(body.matchAll(/^\s*(--[\w-]+)\s*:/gm)).flatMap((match) => match[1] ?? [])
}

describe('tokens.scss', () => {
  it('declares the 48 prototype tokens in :root', () => {
    const names = tokenNames(LIGHT)

    expect(names).toHaveLength(48)
    expect(names.toSorted()).toEqual(PROTOTYPE_TOKENS.toSorted())
  })

  it('declares the 48 prototype tokens in the dark theme', () => {
    const names = tokenNames(DARK)

    expect(names).toHaveLength(48)
    expect(names.toSorted()).toEqual(PROTOTYPE_TOKENS.toSorted())
  })

  it('declares the same names in both themes', () => {
    expect(tokenNames(DARK).toSorted()).toEqual(tokenNames(LIGHT).toSorted())
  })
})
