/**
 * Staffing helpers shared by the two "assign staff to a game" routes.
 */

export type StaffRole = "animator" | "host" | "dj" | string

interface LeadRates {
  animatorRate?: number | string | null
  hostRate?: number | string | null
  djRate?: number | string | null
}

/** Upper bound for a client-supplied rate; the snapshot becomes a "fot" expense. */
export const MAX_ASSIGNMENT_RATE = 100_000

/**
 * Rate snapshot for an assignment. The lead's planned rate for the role wins:
 * clients have no real per-person rate (the personnel directory does not store
 * one — the grid sends 0 and the card used to send constants). A client value is
 * used only when the lead has no plan for the role, only when the caller may
 * edit leads (`allowRequested`), and never above MAX_ASSIGNMENT_RATE.
 */
export function resolveAssignmentRate(
  requested: unknown,
  role: StaffRole,
  lead: LeadRates | null | undefined,
  allowRequested = false,
): number {
  const planned = !lead
    ? 0
    : role === "animator" ? lead.animatorRate : role === "host" ? lead.hostRate : role === "dj" ? lead.djRate : 0
  const p = Number(planned)
  if (Number.isFinite(p) && p > 0) return Math.round(p)
  if (!allowRequested) return 0
  const r = Number(requested)
  if (Number.isFinite(r) && r > 0) return Math.min(Math.round(r), MAX_ASSIGNMENT_RATE)
  return 0
}

function toMinutes(t: string | null | undefined): number | null {
  if (!t || typeof t !== "string") return null
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim())
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export interface ScheduleSlot {
  id: string
  clientName?: string | null
  gameTime?: string | null
  duration?: number | string | null
}

/**
 * Returns the first other game on the same day whose time window overlaps.
 * Windows are [start, start + duration hours). If either side has no time,
 * we do not treat it as a conflict — an unknown time must not block staffing.
 */
export function findTimeConflict(
  target: { gameTime?: string | null; duration?: number | string | null },
  rows: readonly Record<string, any>[],   // postgres.js RowList is fine here
): ScheduleSlot | null {
  const t0 = toMinutes(target.gameTime)
  if (t0 === null) return null
  const d0 = Math.max(1, Number(target.duration) || 3) * 60
  for (const o of rows as ScheduleSlot[]) {
    const t1 = toMinutes(o.gameTime)
    if (t1 === null) continue
    const d1 = Math.max(1, Number(o.duration) || 3) * 60
    const overlap = t0 < t1 + d1 && t1 < t0 + d0
    if (overlap) return o
  }
  return null
}
