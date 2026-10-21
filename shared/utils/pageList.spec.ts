// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { pageList } from './pageList'

// [total, current, normal list, compact list], written the way the nav shows them. '…' stands for
// two pages or more: a gap of a single page shows that page (page 4 of 8 is "1 2 3 4 5 … 8", not
// the prototype's "1 … 3 4 5 … 8"), in both modes.
const lists: Array<[number, number, string, string]> = [
  [5, 1, '1 2 3 4 5', '1 2 3 4 5'],
  [5, 3, '1 2 3 4 5', '1 2 3 4 5'],
  [5, 5, '1 2 3 4 5', '1 2 3 4 5'],
  [6, 3, '1 2 3 4 5 6', '1 2 3 … 6'],
  [7, 1, '1 2 3 4 5 6 7', '1 … 7'],
  [7, 4, '1 2 3 4 5 6 7', '1 … 4 … 7'],
  [7, 7, '1 2 3 4 5 6 7', '1 … 7'],
  [8, 1, '1 2 3 4 … 8', '1 … 8'],
  [8, 2, '1 2 3 4 … 8', '1 2 … 8'],
  [8, 4, '1 2 3 4 5 … 8', '1 … 4 … 8'],
  [8, 5, '1 … 4 5 6 7 8', '1 … 5 … 8'],
  [8, 7, '1 … 5 6 7 8', '1 … 7 8'],
  [8, 8, '1 … 5 6 7 8', '1 … 8'],
  [22, 1, '1 2 3 4 … 22', '1 … 22'],
  [22, 2, '1 2 3 4 … 22', '1 2 … 22'],
  [22, 3, '1 2 3 4 … 22', '1 2 3 … 22'],
  [22, 4, '1 2 3 4 5 … 22', '1 … 4 … 22'],
  [22, 11, '1 … 10 11 12 … 22', '1 … 11 … 22'],
  [22, 19, '1 … 18 19 20 21 22', '1 … 19 … 22'],
  [22, 20, '1 … 19 20 21 22', '1 … 20 21 22'],
  [22, 21, '1 … 19 20 21 22', '1 … 21 22'],
  [22, 22, '1 … 19 20 21 22', '1 … 22'],
]

describe('pageList', () => {
  it.each(lists)('total %i, page %i', (total, current, normal, compact) => {
    expect(pageList(current, total, false).join(' ')).toBe(normal)
    expect(pageList(current, total, true).join(' ')).toBe(compact)
  })

  // join() would hide a page that came out as text
  it('returns page numbers, also where it fills a gap of one page', () => {
    expect(pageList(4, 8, false)).toStrictEqual([1, 2, 3, 4, 5, '…', 8])
  })
})
