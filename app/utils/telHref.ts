// "(54) 3190-3469" -> "tel:+555431903469": with the country code the call works from any phone
// (ADR-0013)
export const telHref = (phone: string) => `tel:+55${phone.replace(/\D/g, '')}`
