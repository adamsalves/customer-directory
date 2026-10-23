// "ELEUTÉRIO" -> "eleuterio": lowercase, and NFD splits each letter from its accent (\p{M}) so only
// the letter stays. The slug (ADR-0006) and the name search both compare text this way.
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
