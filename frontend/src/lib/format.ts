const numberFormat = new Intl.NumberFormat('id-ID')
const decimalFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const currencyFormat = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function number(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—'
  if (decimals === 0) return numberFormat.format(Math.round(value))
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function decimal(value: number): string {
  return decimalFormat.format(value)
}

export function rupiah(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return currencyFormat.format(value)
}

export function compactRupiah(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1_000_000_000) return `Rp ${decimal(value / 1_000_000_000)} M`
  if (Math.abs(value) >= 1_000_000) return `Rp ${decimal(value / 1_000_000)} jt`
  if (Math.abs(value) >= 1_000) return `Rp ${decimal(value / 1_000)} rb`
  return rupiah(value)
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function dateOnly(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function timeOnly(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)
  if (Math.abs(minutes) < 1) return 'baru saja'
  if (Math.abs(minutes) < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return `${days} hari lalu`
  return dateOnly(value)
}

export function monthName(month: number): string {
  return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, month - 1, 1))
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function panelStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'NORMAL') return 'success'
  if (status === 'WARNING') return 'warning'
  if (status === 'OVER') return 'danger'
  return 'neutral'
}

export function incidentStatusTone(status: string): 'info' | 'warning' | 'accent' | 'success' {
  if (status === 'BARU') return 'info'
  if (status === 'DITINJAU') return 'warning'
  if (status === 'DALAM_PENANGANAN') return 'accent'
  return 'success'
}

export const nextIncidentStatus: Record<string, { value: string; label: string; action: string } | null> = {
  BARU: { value: 'DITINJAU', label: 'Ditinjau', action: 'Tandai ditinjau' },
  DITINJAU: { value: 'DALAM_PENANGANAN', label: 'Dalam Penanganan', action: 'Mulai penanganan' },
  DALAM_PENANGANAN: { value: 'SELESAI', label: 'Selesai', action: 'Tandai selesai' },
  SELESAI: null,
}
