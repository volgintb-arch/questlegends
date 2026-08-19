import { randomInt } from "crypto"

// D-011: 4-значный код активации квеста, который родитель вводит на
// seeker-passport вместо даты/времени. Уникален глобально по GameLead.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const CODE_LENGTH = 4
const MAX_ATTEMPTS = 20

function generateCandidate(): string {
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(0, ALPHABET.length)]
  }
  return code
}

// sql — postgres tagged template из lib/db.
// Проверяем занятость через WHERE "activationCode" = <candidate>, ретраим
// до 20 раз (при 10к активных лидов вероятность 20 подряд коллизий → 0).
export async function allocateActivationCode(
  sql: (strings: TemplateStringsArray, ...args: any[]) => Promise<any[]>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCandidate()
    const clash = await sql`
      SELECT id FROM "GameLead" WHERE "activationCode" = ${candidate} LIMIT 1
    `
    if (clash.length === 0) return candidate
  }
  throw new Error("Не удалось выделить уникальный код активации за 20 попыток")
}
