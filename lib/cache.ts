/**
 * Модуль кеширования с graceful degradation.
 *
 * Стратегия: in-memory кеш с TTL и автоочисткой.
 * Если в будущем появится Redis (ioredis), достаточно заменить
 * реализацию get/set/del/invalidatePattern внутри этого файла --
 * весь остальной код продолжит работать без изменений.
 *
 * API:
 *   cache.get<T>(key)                  — получить значение или null
 *   cache.set(key, value, ttlSeconds)  — записать с TTL (по умолчанию 300с = 5 мин)
 *   cache.del(key)                     — удалить ключ
 *   cache.invalidatePattern(pattern)   — удалить все ключи, начинающиеся с pattern
 */

const DEFAULT_TTL = 300 // 5 минут

interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry>()

// Автоочистка просроченных записей каждые 60 секунд
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(key)
    }
  }
}

/**
 * Получить значение из кеша.
 * Возвращает null, если ключ не найден или просрочен.
 * При любой ошибке возвращает null (graceful degradation).
 */
async function get<T = unknown>(key: string): Promise<T | null> {
  try {
    cleanup()
    const entry = store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      store.delete(key)
      return null
    }
    return entry.value as T
  } catch {
    return null
  }
}

/**
 * Записать значение в кеш с TTL.
 * @param ttlSeconds — время жизни в секундах (по умолчанию 300 = 5 мин)
 * При любой ошибке молча игнорируется (graceful degradation).
 */
async function set(key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
  try {
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  } catch {
    // Graceful degradation: кеш недоступен — работаем без него
  }
}

/**
 * Удалить конкретный ключ из кеша.
 */
async function del(key: string): Promise<void> {
  try {
    store.delete(key)
  } catch {
    // Graceful degradation
  }
}

/**
 * Удалить все ключи, начинающиеся с заданного префикса.
 * Пример: invalidatePattern("franchisees:") удалит
 *   "franchisees:all", "franchisees:user:123" и т.д.
 */
async function invalidatePattern(pattern: string): Promise<void> {
  try {
    for (const key of store.keys()) {
      if (key.startsWith(pattern)) {
        store.delete(key)
      }
    }
  } catch {
    // Graceful degradation
  }
}

export const cache = { get, set, del, invalidatePattern }
