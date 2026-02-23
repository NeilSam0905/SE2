const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatInteger(value) {
  if (value === null || value === undefined || value === '') return ''

  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (!Number.isFinite(numeric)) return String(value)
  return integerFormatter.format(numeric)
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return ''

  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (!Number.isFinite(numeric)) return String(value)
  return moneyFormatter.format(numeric)
}
