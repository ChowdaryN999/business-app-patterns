import type { SageRequest, StatusRow } from '../domain/types'
import { DDAT_STATUS, REQUEST_TYPES, STATUS } from '../domain/types'

const DAY = 86_400_000

/** Whole days since the request was submitted. */
export function ageDays(r: SageRequest, now: Date): number {
  const t = new Date(r.created).getTime()
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now.getTime() - t) / DAY))
}

export function ageLabel(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

export interface StatusCount {
  status: string
  count: number
}

/** One entry per status in list order, including statuses with no requests. */
export function statusCounts(rows: SageRequest[], statuses: StatusRow[]): StatusCount[] {
  const ordered = [...statuses].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.id - b.id)
  return ordered.map((s) => ({ status: s.title, count: rows.filter((r) => r.requestStatus?.value === s.title).length }))
}

export const isOpen = (r: SageRequest) =>
  r.requestStatus?.value !== STATUS.completed && r.requestStatus?.value !== STATUS.rejected

/** Open requests, longest-waiting first. */
export function oldestOpen(rows: SageRequest[], limit: number): SageRequest[] {
  return rows
    .filter(isOpen)
    .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
    .slice(0, limit)
}

export type WeekBucket = { week: string } & Record<string, number | string>

/** Monday of the week containing d, local time. */
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/** Requests submitted per week for the last `weeks` weeks, split by request type. */
export function weeklyIntake(rows: SageRequest[], weeks: number, now: Date): WeekBucket[] {
  const last = weekStart(now)
  const buckets: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(last)
    start.setDate(start.getDate() - i * 7)
    const b: WeekBucket = { week: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    for (const t of REQUEST_TYPES) b[t] = 0
    buckets.push(b)
  }
  for (const r of rows) {
    const t = r.requestType?.value
    const d = new Date(r.created)
    if (!t || Number.isNaN(d.getTime())) continue
    const idx = weeks - 1 - Math.round((last.getTime() - weekStart(d).getTime()) / (7 * DAY))
    if (idx >= 0 && idx < weeks && typeof buckets[idx][t] === 'number') (buckets[idx][t] as number) += 1
  }
  return buckets
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export interface TriageInsights {
  open: number
  /** Open with nobody assigned. */
  unassigned: number
  /** Open, escalated, and DDAT has neither delivered nor rejected. */
  waitingOnDdat: number
  /** Age in days of the longest-waiting open request, or null when nothing is open. */
  oldestOpenDays: number | null
}

export function triageInsights(rows: SageRequest[], now: Date): TriageInsights {
  const open = rows.filter(isOpen)
  return {
    open: open.length,
    unassigned: open.filter((r) => !r.assignedTo).length,
    waitingOnDdat: open.filter(
      (r) => r.ddatNeeded === 'Yes' && r.ddatStatus !== DDAT_STATUS.delivered && r.ddatStatus !== DDAT_STATUS.rejected,
    ).length,
    oldestOpenDays: open.length ? Math.max(...open.map((r) => ageDays(r, now))) : null,
  }
}

export const inDomain = (rows: SageRequest[], domain: string) =>
  domain ? rows.filter((r) => r.businessTeam?.value === domain) : rows
