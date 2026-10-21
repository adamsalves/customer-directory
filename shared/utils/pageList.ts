// Page numbers of the pagination nav, with '…' where pages are left out. The compact list keeps
// only the first, the current and the last page, and only with more than 5 pages: up to 5 it shows
// them all. The normal list shows them all up to 7; beyond that it keeps the first and the last
// page, the neighbours of the current one, and the first or last four pages while the current one
// is near an end. Same selection as the prototype's pageList, but a gap of a single page shows
// that page: '…' never stands for just one (the prototype shows it).
export function pageList(current: number, total: number, compact: boolean): Array<number | '…'> {
  let pages: number[]
  if (compact && total > 5) {
    pages = [1, current, total]
  } else if (total <= 7) {
    pages = Array.from({ length: total }, (_, index) => index + 1)
  } else {
    pages = [1, current - 1, current, current + 1, total]
    if (current <= 3) pages.push(2, 3, 4)
    if (current >= total - 2) pages.push(total - 3, total - 2, total - 1)
  }

  const sorted = [...new Set(pages)]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b)
  const list: Array<number | '…'> = []
  let previous = 0
  for (const page of sorted) {
    const hidden = page - previous - 1
    if (hidden === 1) list.push(previous + 1)
    else if (hidden > 1) list.push('…')
    list.push(page)
    previous = page
  }
  return list
}
