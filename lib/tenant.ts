/**
 * Tenant isolation helpers.
 *
 * Single source of truth for "which franchisee may this user touch".
 * Rules:
 *  - UK-level roles (uk, super_admin, uk_employee) may access any franchisee.
 *  - Everyone else may access only their own franchisee.
 *  - A user without a franchiseeId is never considered a match: comparing
 *    null === null must NOT grant access (this was a real bug elsewhere).
 */

export const UK_ROLES = ["uk", "super_admin", "uk_employee"] as const

export interface TenantUser {
  role: string
  franchiseeId?: string | null
}

export function isUkRole(role: string | null | undefined): boolean {
  return !!role && (UK_ROLES as readonly string[]).includes(role)
}

/**
 * True if `user` may read/modify an entity that belongs to `franchiseeId`.
 * An entity with no franchiseeId is reachable only by UK roles.
 */
export function canAccessFranchisee(user: TenantUser, franchiseeId: string | null | undefined): boolean {
  if (isUkRole(user.role)) return true
  if (!user.franchiseeId) return false
  if (!franchiseeId) return false
  return user.franchiseeId === franchiseeId
}

/**
 * Resolve the franchisee filter for list endpoints.
 * UK roles: honour the requested id (or null = "all").
 * Others: always their own franchisee, the requested id is ignored.
 * Returns `undefined` when the user has no franchisee and is not UK — callers
 * must treat that as 403, not as "no filter".
 */
export function resolveFranchiseeFilter(
  user: TenantUser,
  requestedId: string | null | undefined,
): string | null | undefined {
  if (isUkRole(user.role)) return requestedId || null
  if (!user.franchiseeId) return undefined
  return user.franchiseeId
}
