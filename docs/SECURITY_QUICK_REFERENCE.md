# Security Quick Reference

## Защищенные API Endpoints

Все API endpoints в системе защищены комплексной системой безопасности.

### Обязательные проверки для каждого endpoint:

1. **Rate Limiting** - ограничение частоты запросов
2. **Authentication** - проверка авторизации через NextAuth
3. **Authorization** - проверка прав доступа по ролям
4. **Input Validation** - валидация и санитизация входных данных
5. **UUID Validation** - проверка корректности ID

### Примеры использования:

#### GET endpoint (чтение данных):
```typescript
import { requireApiAuth, withRateLimit } from "@/lib/api-auth"

export async function GET(request: Request) {
  // Rate limiting: 60 запросов в минуту
  const rateLimitError = await withRateLimit(request, 60, 60000)
  if (rateLimitError) return rateLimitError

  // Проверка авторизации
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  // Ваша логика здесь
}
```

#### POST/PUT/DELETE endpoint (изменение данных):
```typescript
import { 
  requireApiAuth, 
  requireRoles, 
  withRateLimit, 
  sanitizeBody,
  validateUUIDs 
} from "@/lib/api-auth"

export async function POST(request: Request) {
  // Rate limiting: 10 запросов в минуту
  const rateLimitError = await withRateLimit(request, 10, 60000)
  if (rateLimitError) return rateLimitError

  // Проверка авторизации
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  // Проверка роли
  const rolesError = requireRoles(user, ["super_admin", "uk_company"])
  if (rolesError) return rolesError

  // Получение и санитизация данных
  const rawBody = await request.json()
  const body = sanitizeBody(rawBody)

  // Валидация UUID если есть
  if (body.franchiseeId) {
    const uuidError = validateUUIDs({ franchiseeId: body.franchiseeId })
    if (uuidError) return uuidError
  }

  // Ваша логика здесь
}
```

## Роли и права доступа

### Роли в системе:
- `super_admin` - полный доступ ко всему
- `uk` / `uk_company` - управляющая компания
- `uk_employee` - сотрудник УК
- `franchisee` - франчайзи
- `own_point` - собственная точка
- `admin` - администратор франшизы
- `employee` - сотрудник (animator, host, dj)

### Проверка доступа к данным франчайзи:
```typescript
import { requireFranchiseeMatch } from "@/lib/api-auth"

// Только super_admin, uk, uk_company могут видеть все франшизы
// Остальные только свою
const accessError = requireFranchiseeMatch(user, targetFranchiseeId)
if (accessError) return accessError
```

## Input Validation

### Доступные валидаторы:
```typescript
import { 
  validatePhone,
  validateEmail,
  validateURL,
  validateDate,
  validateNumber,
  validateRole,
  validateTransactionType 
} from "@/lib/input-validation"

// Примеры:
if (!validatePhone(phone)) {
  return NextResponse.json({ error: "Неверный формат телефона" }, { status: 400 })
}

if (!validateEmail(email)) {
  return NextResponse.json({ error: "Неверный формат email" }, { status: 400 })
}
```

## Security Monitoring

### Просмотр статистики безопасности:
```
GET /api/security/stats
Authorization: Bearer <token>
Role: super_admin only
```

Возвращает:
- Общее количество security events
- События за последний час
- Заблокированные IP адреса
- Распределение по типам атак

### Типы отслеживаемых атак:
- `sql_injection` - попытки SQL инъекций
- `xss` - попытки XSS атак
- `path_traversal` - попытки обхода путей
- `rate_limit` - превышение лимитов запросов
- `invalid_auth` - неудачные попытки авторизации

## Rate Limits по категориям:

| Операция | Лимит | Окно |
|----------|-------|------|
| GET (чтение) | 60 req | 1 мин |
| POST (создание) | 10 req | 1 мин |
| PUT/PATCH (обновление) | 20 req | 1 мин |
| DELETE (удаление) | 10 req | 1 мин |
| Login | 5 req | 5 мин |

## Автоматическая блокировка IP:

- После **5 нарушений** безопасности (SQL injection, XSS и т.д.)
- Блокировка на **1 час**
- Автоматическая разблокировка после истечения времени

## Защита от атак:

### SQL Injection:
- Все запросы используют параметризованные SQL (Neon template literals)
- Детектор паттернов SQL инъекций во входных данных
- Автоматическая блокировка IP при обнаружении

### XSS (Cross-Site Scripting):
- Санитизация всех входных данных
- CSP заголовки блокируют inline scripts
- Детектор XSS паттернов

### CSRF (Cross-Site Request Forgery):
- NextAuth использует CSRF tokens автоматически
- SameSite cookies

### Path Traversal:
- Валидация путей к файлам
- Блокировка паттернов `../` и подобных

## Debugging Security Issues:

Добавьте console.log с префиксом [v0] для отладки:
```typescript
console.log("[v0] User role:", user.role)
console.log("[v0] Checking permission:", permissionKey)
```

Эти логи видны в debug панели v0.

## Контрольный список для нового endpoint:

- [ ] Добавлен rate limiting через `withRateLimit()`
- [ ] Добавлена проверка авторизации через `requireApiAuth()`
- [ ] Добавлена проверка ролей через `requireRoles()` если нужно
- [ ] Входные данные санитизированы через `sanitizeBody()`
- [ ] UUID валидированы через `validateUUIDs()` если есть
- [ ] Добавлена проверка доступа к франчайзи если нужно
- [ ] Используются параметризованные SQL запросы (template literals)
- [ ] Обработаны все ошибки с понятными сообщениями

## Полезные ссылки:

- [Полная документация: SECURITY.md](/SECURITY.md)
- [NextAuth документация](https://next-auth.js.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
