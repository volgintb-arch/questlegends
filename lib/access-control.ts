/**
 * Централизованная система проверки прав доступа
 * Роль "uk" является верхнеуровневой с полным доступом ко всему функционалу.
 * Роль "super_admin" объединена в "uk" - все проверки на super_admin также включают uk для обратной совместимости.
 */

// Маппинг существующих ролей к стандартизированной модели
export const ROLE_HIERARCHY = {
  // Уровень 1: Управляющая компания (полный доступ, включая бывший super_admin)
  super_admin: 100, // обратная совместимость, фактически = uk
  uk: 100,
  uk_employee: 60,

  // Уровень 2: Владельцы франшиз
  franchisee: 50,
  own_point: 50,

  // Уровень 3: Операционное управление
  admin: 40,

  // Уровень 4: Сотрудники
  employee: 20,
  animator: 20,
  host: 20,
  dj: 20,
} as const

export type SystemRole = keyof typeof ROLE_HIERARCHY

// Стандартизированные названия ролей согласно спецификации
export const ROLE_MAPPING = {
  super_admin: "UK_OWNER", // обратная совместимость
  uk: "UK_OWNER",
  uk_employee: "UK_STAFF",
  franchisee: "FRANCHISE_OWNER",
  own_point: "FRANCHISE_OWNER",
  admin: "FRANCHISE_ADMIN",
  employee: "FRANCHISE_STAFF",
  animator: "FRANCHISE_STAFF",
  host: "FRANCHISE_STAFF",
  dj: "FRANCHISE_STAFF",
} as const

// Определение разрешений для модулей
export const MODULE_PERMISSIONS = {
  dashboard: ["uk", "super_admin", "uk_employee", "franchisee", "own_point", "admin", "employee", "animator", "host", "dj"],
  crm: ["uk", "super_admin", "uk_employee", "franchisee", "own_point", "admin", "employee"],
  b2b_crm: ["uk", "super_admin", "uk_employee"],
  erp: ["uk", "super_admin", "franchisee", "own_point"],
  finances: ["uk", "super_admin", "franchisee", "own_point", "admin"],
  personnel: ["uk", "super_admin", "franchisee", "own_point"],
  schedules: ["uk", "super_admin", "franchisee", "own_point", "admin", "employee", "animator", "host", "dj"],
  access: ["uk", "super_admin", "franchisee", "own_point"],
  knowledge_base: ["uk", "super_admin", "uk_employee", "franchisee", "own_point", "admin", "employee", "animator", "host", "dj"],
  analytics: ["uk", "super_admin", "franchisee", "own_point"],
  audit_log: ["uk", "super_admin"],
  system_settings: ["uk", "super_admin"],
  integrations: ["uk", "super_admin", "franchisee", "own_point"],
} as const

export type ModuleName = keyof typeof MODULE_PERMISSIONS

// Определение действий для ресурсов
export const RESOURCE_ACTIONS = {
  leads: {
    view: ["uk", "super_admin", "uk_employee", "franchisee", "own_point", "admin", "employee"],
    create: ["uk", "super_admin", "uk_employee", "franchisee", "own_point", "admin", "employee"],
    edit: ["uk", "super_admin", "uk_employee", "franchisee", "own_point", "admin"],
    delete: ["uk", "super_admin", "franchisee", "own_point"],
    change_status: ["uk", "super_admin", "uk_employee", "franchisee", "own_point", "admin", "employee"],
  },
  users: {
    view: ["uk", "super_admin", "franchisee", "own_point", "admin"],
    create: ["uk", "super_admin", "franchisee", "own_point", "admin"],
    edit: ["uk", "super_admin", "franchisee", "own_point"],
    delete: ["uk", "super_admin"],
    change_role: ["uk", "super_admin", "franchisee", "own_point"],
  },
  franchisees: {
    view: ["uk", "super_admin", "uk_employee"],
    create: ["uk", "super_admin"],
    edit: ["uk", "super_admin"],
    delete: ["uk", "super_admin"],
  },
  transactions: {
    view: ["uk", "super_admin", "franchisee", "own_point", "admin"],
    create: ["uk", "super_admin", "franchisee", "own_point", "admin"],
    edit: ["uk", "super_admin", "franchisee", "own_point"],
    delete: ["uk", "super_admin"],
  },
  expenses: {
    view: ["uk", "super_admin", "franchisee", "own_point", "admin"],
    create: ["uk", "super_admin", "franchisee", "own_point", "admin"],
    edit: ["uk", "super_admin", "franchisee", "own_point"],
    delete: ["uk", "super_admin", "franchisee", "own_point"],
  },
  integrations: {
    view: ["uk", "super_admin", "franchisee", "own_point"],
    create: ["uk", "super_admin", "franchisee", "own_point"],
    edit: ["uk", "super_admin", "franchisee", "own_point"],
    delete: ["uk", "super_admin", "franchisee", "own_point"],
  },
} as const

export type ResourceName = keyof typeof RESOURCE_ACTIONS
export type ActionName = "view" | "create" | "edit" | "delete" | "change_status" | "change_role"

// Интерфейс пользователя для проверки прав
export interface AccessUser {
  id: string
  role: SystemRole
  franchiseeId?: string | null
  franchiseeIds?: string[]
}

/**
 * Класс для централизованной проверки прав доступа
 */
export class AccessControl {
  private user: AccessUser

  constructor(user: AccessUser) {
    this.user = user
  }

  /**
   * Проверяет, является ли пользователь владельцем УК (полный доступ).
   * Роль super_admin объединена в uk - обе имеют одинаковый уровень доступа.
   */
  isUKOwner(): boolean {
    return this.user.role === "uk" || this.user.role === "super_admin"
  }

  /**
   * @deprecated Используйте isUKOwner() - super_admin объединён в uk
   */
  isSuperAdmin(): boolean {
    return this.isUKOwner()
  }

  /**
   * Проверяет, принадлежит ли пользователь к УК (включая сотрудников)
   */
  isUKStaff(): boolean {
    return ["super_admin", "uk", "uk_employee"].includes(this.user.role)
  }

  /**
   * Проверяет, является ли пользователь владельцем франшизы
   */
  isFranchiseOwner(): boolean {
    return ["franchisee", "own_point"].includes(this.user.role)
  }

  /**
   * Проверяет, является ли пользователь администратором франшизы
   */
  isFranchiseAdmin(): boolean {
    return this.user.role === "admin"
  }

  /**
   * Проверяет, является ли пользователь сотрудником франшизы (включая владельцев и админов)
   */
  isFranchiseStaff(): boolean {
    return ["franchisee", "own_point", "admin", "employee", "animator", "host", "dj"].includes(this.user.role)
  }

  /**
   * Получает уровень доступа пользователя
   */
  getAccessLevel(): number {
    return ROLE_HIERARCHY[this.user.role] || 0
  }

  /**
   * Проверяет доступ к модулю
   */
  canAccessModule(module: ModuleName): boolean {
    if (this.isUKOwner()) return true
    const allowedRoles = MODULE_PERMISSIONS[module]
    return allowedRoles.includes(this.user.role)
  }

  /**
   * Проверяет право на действие с ресурсом
   */
  canPerformAction(resource: ResourceName, action: ActionName): boolean {
    if (this.isUKOwner()) return true

    const resourceActions = RESOURCE_ACTIONS[resource]
    if (!resourceActions) return false

    const allowedRoles = (resourceActions as Record<string, readonly string[]>)[action]
    if (!allowedRoles) return false

    return allowedRoles.includes(this.user.role)
  }

  /**
   * Проверяет доступ к данным конкретной франшизы
   */
  canAccessFranchisee(franchiseeId: string): boolean {
    // Супер-админ и УК видят все
    if (this.isUKStaff()) return true

    // Остальные видят только свою франшизу
    if (this.user.franchiseeId === franchiseeId) return true

    // Проверка множественных франшиз
    if (this.user.franchiseeIds?.includes(franchiseeId)) return true

    return false
  }

  /**
   * Проверяет, может ли пользователь создавать пользователей с данной ролью
   */
  canCreateUserWithRole(targetRole: SystemRole): boolean {
    if (this.isUKOwner()) {
      // UK Owner может создавать все роли кроме uk/super_admin (себе равных)
      return ["franchisee", "own_point", "uk_employee", "admin", "employee", "animator", "host", "dj"].includes(targetRole)
    }

    const userLevel = this.getAccessLevel()
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0

    // Можно создавать только пользователей с уровнем ниже своего
    if (targetLevel >= userLevel) return false

    // Специальные ограничения для uk_employee
    if (this.user.role === "uk_employee") {
      return false // uk_employee не может создавать пользователей
    }

    if (this.isFranchiseOwner()) {
      return ["admin", "employee", "animator", "host", "dj"].includes(targetRole)
    }

    if (this.isFranchiseAdmin()) {
      return ["employee", "animator", "host", "dj"].includes(targetRole)
    }

    return false
  }

  /**
   * Фильтрует данные по доступным франшизам
   */
  filterByAccessibleFranchisees<T extends { franchiseeId?: string | null }>(items: T[]): T[] {
    if (this.isUKStaff()) return items

    return items.filter((item) => {
      if (!item.franchiseeId) return false
      return this.canAccessFranchisee(item.franchiseeId)
    })
  }

  /**
   * Получает список доступных франшиз для пользователя
   */
  getAccessibleFranchiseeIds(): string[] | null {
    if (this.isUKStaff()) return null // null означает "все"

    const ids: string[] = []
    if (this.user.franchiseeId) ids.push(this.user.franchiseeId)
    if (this.user.franchiseeIds) ids.push(...this.user.franchiseeIds)

    return ids
  }
}

/**
 * Создает экземпляр AccessControl из токена
 */
export function createAccessControl(user: AccessUser): AccessControl {
  return new AccessControl(user)
}

/**
 * Проверяет роль и возвращает стандартизированное название
 */
export function getStandardizedRole(role: string): string {
  return ROLE_MAPPING[role as SystemRole] || "UNKNOWN"
}

/**
 * Проверяет, является ли роль валидной
 */
export function isValidRole(role: string): role is SystemRole {
  return role in ROLE_HIERARCHY
}
