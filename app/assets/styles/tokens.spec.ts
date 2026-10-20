// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { prototypePage } from '../../../tests/prototypePage'

const prototype = prototypePage()
const tokens = readFileSync(new URL('./tokens.scss', import.meta.url), 'utf8').replace(
  /\/\/[^\n]*/g,
  '',
)

function declarations(source: string, block: RegExp): Map<string, string> {
  const body = block.exec(source)?.[1]
  if (body === undefined) throw new Error(`${block.source} not found`)
  return new Map(
    Array.from(body.matchAll(/(--[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)).flatMap(([, name, value]) =>
      name === undefined || value === undefined ? [] : [[name, value] as const],
    ),
  )
}

function rgba(channels: number[], alpha: number): string {
  return [...channels, Math.round(alpha * 100) / 100].join(',')
}

// #rgb, #rrggbb, #rrggbbaa, rgba(r,g,b,a) and rgb(r g b / a%) all become "r,g,b,a".
function normalize(value: string): string {
  return value
    .replace(/rgba?\(([^)]*)\)/g, (_, inner: string) => {
      const [r = '', g = '', b = '', a = '1'] = inner.split(/[\s,/]+/).filter(Boolean)
      return rgba([r, g, b].map(Number), a.endsWith('%') ? parseFloat(a) / 100 : Number(a))
    })
    .replace(/#([0-9a-f]{3,8})\b/gi, (_, hex: string) => {
      const full = hex.length < 6 ? hex.replace(/./g, '$&$&') : hex
      const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
      return rgba(channels, full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1)
    })
}

type TTheme = {
  theme: string
  prototype: RegExp
  tokens: RegExp
  deviations: Record<string, string>
}

// ADR-0013: the only values allowed to differ from the prototype.
const THEMES: TTheme[] = [
  {
    theme: 'light',
    prototype: /:root\{(color-scheme:light;[^}]*)\}/,
    tokens: /^:root\s*\{([^}]*)\}/m,
    deviations: { '--overlay': 'rgb(20 26 33 / 50%)', '--input-border': '#858a91' },
  },
  {
    theme: 'dark',
    prototype: /\[data-theme="dark"\]\{(color-scheme:dark;[^}]*)\}/,
    tokens: /^\[data-theme='dark'\]\s*\{([^}]*)\}/m,
    deviations: {},
  },
]

describe('tokens.scss', () => {
  it.each(THEMES)('declares the 48 prototype names in the $theme theme', (theme) => {
    const expected = [...declarations(prototype, theme.prototype).keys()]
    const actual = [...declarations(tokens, theme.tokens).keys()]

    expect(expected).toHaveLength(48)
    expect(actual.toSorted()).toEqual(expected.toSorted())
  })

  it.each(THEMES)('matches the prototype values in the $theme theme', (theme) => {
    const actual = declarations(tokens, theme.tokens)
    const expected = declarations(prototype, theme.prototype)

    for (const [name, value] of expected) {
      expect
        .soft(normalize(actual.get(name) ?? ''), name)
        .toBe(normalize(theme.deviations[name] ?? value))
    }
  })
})
