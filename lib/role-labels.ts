export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Супер Администратор",
  uk: "Управляющая Компания",
  uk_employee: "Сотрудник УК",
  franchisee: "Франчайзи",
  own_point: "Собственная Точка",
  admin: "Администратор",
  employee: "Сотрудник",
  animator: "Аниматор",
  host: "Ведущий",
  dj: "DJ",
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role
}
