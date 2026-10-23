// "ELEUTÉRIO" -> "eleuterio": lowercase, and NFKD splits each letter from its accent (\p{M}) so only
// the letter stays. NFKD, not NFD: it also turns compatibility forms into plain letters, such as the
// full-width "ａｎａ" some keyboards type or the "ﬁ" ligature. The slug (ADR-0006) and the name
// search both compare text this way.
export function foldText(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
}
