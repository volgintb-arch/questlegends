export const PERMISSIONS = {
  // UK permissions
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

  // Personnel permissions (Animator, Host, DJ)
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

export function hasPermission(role: string, permission: string): boolean {
  const rolePermissions = PERMISSIONS[role as keyof typeof PERMISSIONS]
  if (!rolePermissions) return false
  return rolePermissions[permission as keyof typeof rolePermissions] === true
}

export function canAccessResource(
  userRole: string,
  userFranchiseeId: string | null,
  resourceFranchiseeId: string | null,
): boolean {
  if (userRole === "UK") return true
  if (resourceFranchiseeId === null) return false
  return userFranchiseeId === resourceFranchiseeId
}
