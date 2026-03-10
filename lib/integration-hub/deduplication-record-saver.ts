// Deduplication Record Saver - сохранение записей дедупликации
import { sql } from "@/lib/db"
import type { NormalizedMessage } from "./message-normalizer"

export async function saveDeduplicationRecord(
  message: NormalizedMessage,
  leadId: string,
  leadType: string,
  integrationId: string,
): Promise<void> {
  const id = globalThis.crypto.randomUUID()
  await sql`
    INSERT INTO LeadDeduplication (
      id,
      integration_id,
      channel,
      external_user_id,
      phone,
      lead_id,
      lead_type,
      created_at
    ) VALUES (
      ${id},
      ${integrationId},
      ${message.channel},
      ${message.external_user_id},
      ${message.phone || null},
      ${leadId},
      ${leadType},
      NOW()
    )
    ON CONFLICT (channel, external_user_id) DO NOTHING
  `
}
