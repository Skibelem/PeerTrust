export const PTC_RATE = 100 // 1 PTC = ₦100

export function formatNGN(val) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(Number(val || 0))
}

export function formatPTC(val) {
  const credits = Number(val || 0) / PTC_RATE

  return `${new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: credits % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(credits)} PTC`
}

export function formatPTCWithNaira(val) {
  return `${formatPTC(val)} (${formatNGN(val)})`
}