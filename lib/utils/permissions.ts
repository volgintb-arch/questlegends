export const PERMISSIONS = {
  // UK Owner (объединённая роль super_admin + uk) - полный доступ
  UK: {
    canViewAllFranchisees: true,
    canManageFranchisees: true,
    canViewB2BCRM: true,
    canManageB2BCRM: true,
    canViewKnowledgeBase: true,
    canManageKnowledgeBase: true,
    canViewAnalytics: true,
    canCreateUsers: true,
    canManageSettings: true,
    canManageAccess: true,
    canViewCRM: true,
    canManageCRM: true,
    canViewTransactions: true,
    canCreateTransactions: true,
    canViewExpenses: true,
    canManageExpenses: true,
    canViewPersonnel: true,
    canManagePersonnel: true,
    canViewSchedule: true,
    canManageSchedule: true,
    canViewAuditLog: true,
    canDeleteFranchisees: true,
  },

  // UK Employee - ограниченный доступ, настраивается через UserPermission
  UK_EMPLOYEE: {
    canViewKnowledgeBase: true,
    canViewCRM: true,
    canViewOwnTasks: true,
  },

  // Franchisee permissions
  FRANCHISEE: {
    canViewOwnFranchisee: true,
    canViewCRM: true,
    canManageCRM: true,
    canViewTransactions: true,
    canCreateTransactions: true,
    canViewExpenses: true,
    canManageExpenses: true,
    canViewPersonnel: true,
    canManagePersonnel: true,
    canViewSchedule: true,
    canManageSchedule: true,
    canViewKnowledgeBase: true,
    canCreateUsers: true,
    canManageAccess: true,
    canViewAnalytics: true,
  },

  // Admin permissions
  ADMIN: {
    canViewCRM: true,
    canManageCRM: true,
    canViewTransactions: true,
    canCreateTransactions: true,
    canViewExpenses: true,
    canManageExpenses: true,
    canViewPersonnel: true,
    canManagePersonnel: true,
    canViewSchedule: true,
    canManageSchedule: true,
    canViewKnowledgeBase: true,
    canCreateUsers: true, // Can only create personnel
  },

  // Employee - базовый доступ
  EMPLOYEE: {
    canViewOwnSchedule: true,
    canViewKnowledgeBase: true,
  },

  // Personnel permissions (Animator, Host, DJ) - идентичны Employee
  ANIMATOR: {
    canViewOwnSchedule: true,
    canViewKnowledgeBase: true,
  },

  HOST: {
    canViewOwnSchedule: true,
    canViewKnowledgeBase: true,
  },

  DJ: {
    canViewOwnSchedule: true,
    canViewKnowledgeBase: true,
  },
}

/**
 * Маппинг ролей из БД к ключам PERMISSIONS
 */
function getPermissionKey(role: string): string {
  if (role === "uk" || role === "super_admin") return "UK"
  if (role === "uk_employee") return "UK_EMPLOYEE"
  if (role === "franchisee" || role === "own_point") return "FRANCHISEE"
  if (role === "admin") return "ADMIN"
  if (role === "employee") return "EMPLOYEE"
  return role.toUpperCase()
}

export function hasPermission(role: string, permission: string): boolean {
  const key = getPermissionKey(role)
  const rolePermissions = PERMISSIONS[key as keyof typeof PERMISSIONS]
  if (!rolePermissions) return false
  return rolePermissions[permission as keyof typeof rolePermissions] === true
}

export function canAccessResource(
  userRole: string,
  userFranchiseeId: string | null,
  resourceFranchiseeId: string | null,
): boolean {
  if (userRole === "uk" || userRole === "super_admin" || userRole === "UK") return true
  if (resourceFranchiseeId === null) return false
  return userFranchiseeId === resourceFranchiseeId
}
