// Deduplication Record Saver - сохранение записей дедупликации
import { sql } from "@/lib/db"
import type { NormalizedMessage } from "./message-normalizer"

export async function saveDeduplicationRecord(
  message: NormalizedMessage,
  leadId: string,
  leadType: string,
  integrationId: string,
): Promise<void> {
  await sql`
    INSERT INTO LeadDeduplication (
      integration_id,
      channel,
      external_user_id,
      phone,
      lead_id,
      lead_type
    ) VALUES (
      ${integrationId},
      ${message.channel},
      ${message.external_user_id},
      ${message.phone || null},
      ${leadId},
      ${leadType}
    )
    ON CONFLICT (channel, external_user_id) DO NOTHING
  `
}
