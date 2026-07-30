import { createHmac, timingSafeEqual } from "crypto"

// Format мы копируем с GitHub webhooks:
//   X-Signature-256: sha256=<hex(hmac_sha256(raw_body_bytes, secret))>
// Подписываем именно сырой body-буфер, а не сериализованный JSON —
// у обеих сторон получается одинаковая последовательность байт независимо
// от порядка ключей и пробелов.
export const WEBHOOK_SIGNATURE_HEADER = "x-signature-256"

const PREFIX = "sha256="

function toBuffer(body: Buffer | string): Buffer {
  return typeof body === "string" ? Buffer.from(body, "utf8") : body
}

export function signWebhook(body: Buffer | string, secret: string): string {
  const hex = createHmac("sha256", secret).update(toBuffer(body)).digest("hex")
  return `${PREFIX}${hex}`
}

// timing-safe сравнение; false для любых форм-факторов испорченного header'а
// (пусто, не-hex, не тот префикс, не та длина).
export function verifyWebhook(
  header: string | null | undefined,
  body: Buffer | string,
  secret: string,
): boolean {
  if (!header || !header.startsWith(PREFIX)) return false

  const expected = createHmac("sha256", secret).update(toBuffer(body)).digest()

  const providedHex = header.slice(PREFIX.length)
  if (!/^[0-9a-fA-F]+$/.test(providedHex)) return false

  const provided = Buffer.from(providedHex, "hex")
  if (provided.length !== expected.length) return false

  return timingSafeEqual(provided, expected)
}
