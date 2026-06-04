/**
 * Helpers de fechas en zona horaria Colombia (America/Bogota, UTC-5)
 */

export function getColombiaDate(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
  )
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=domingo
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // ajustar a lunes
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function subtractDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  return d
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
