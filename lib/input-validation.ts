export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ""))
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function validateDate(date: string): boolean {
  const parsed = Date.parse(date)
  return !isNaN(parsed) && parsed > 0
}

export function validateNumber(value: any, min?: number, max?: number): boolean {
  const num = Number(value)
  if (isNaN(num)) return false
  if (min !== undefined && num < min) return false
  if (max !== undefined && num > max) return false
  return true
}

export function validateLength(value: string, min?: number, max?: number): boolean {
  if (min !== undefined && value.length < min) return false
  if (max !== undefined && value.length > max) return false
  return true
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 255)
}

export function validateRole(role: string): boolean {
  const validRoles = [
    "super_admin",
    "uk",
    "uk_employee",
    "franchisee",
    "own_point",
    "admin",
    "employee",
    "animator",
    "host",
    "dj",
  ]
  return validRoles.includes(role)
}

export function validateTransactionType(type: string): boolean {
  return ["income", "expense"].includes(type)
}

export function validateDealStage(stage: string): boolean {
  const validStages = ["Новый", "В работе", "Согласование", "Завершен", "Отказ"]
  return validStages.includes(stage)
}
