/**
 * Backfill yclid/gclid/utm_*/referrer for existing GameLead and Deal rows
 * by parsing their `notes` field (which contains the original webhook payload
 * dumped as text by older versions of the code).
 *
 * Run on the server:
 *   cd /var/www/questlegends
 *   export $(grep DATABASE_URL .env | xargs)
 *   node scripts/backfill-tracking.mjs
 *
 * Idempotent — only fills fields that are still NULL. Re-running is safe.
 */

import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL?.includes("sslmode=disable") ? false : "prefer",
})

// --- helpers ---------------------------------------------------------------

function looksLikeUrl(v) {
  return /^https?:\/\//i.test(v)
}

function parseUrlParams(url) {
  try {
    const u = new URL(url)
    const out = {}
    u.searchParams.forEach((v, k) => {
      if (v) out[k] = v
    })
    return out
  } catch {
    return {}
  }
}

/**
 * The notes field looks like this (from older Marquiz leads):
 *   "Автосоздано из marquiz: ...
 *   href: https://brn.questlegends.ru/?yclid=ABC&utm_source=yandex...
 *   userAgent: ...
 *   yclid: 11959401520138813439
 *   utm: [object Object]
 *   referrer: https://yandex.ru/
 *   ..."
 *
 * Extract tracking by:
 *   1. Looking for top-level "key: value" lines for yclid, gclid, utm_*, referrer
 *   2. Parsing the href URL for query params
 */
function extractFromNotes(notes) {
  if (!notes || typeof notes !== "string") return null

  const out = {
    yclid: null,
    gclid: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    referrer: null,
  }

  const KEY_MAP = {
    yclid: "yclid",
    gclid: "gclid",
    utm_source: "utmSource",
    utm_medium: "utmMedium",
    utm_campaign: "utmCampaign",
    utm_content: "utmContent",
    utm_term: "utmTerm",
    referrer: "referrer",
    referer: "referrer",
  }

  // Step 1: walk lines like "yclid: 12345"
  for (const line of notes.split(/\r?\n/)) {
    const idx = line.indexOf(":")
    if (idx <= 0) continue
    const k = line.slice(0, idx).trim().toLowerCase()
    const v = line.slice(idx + 1).trim()
    if (!v || v === "[object Object]") continue
    const target = KEY_MAP[k]
    if (target && !out[target]) out[target] = v
  }

  // Step 2: find any href/url string and parse its query params
  const urlMatch = notes.match(/https?:\/\/[^\s"]+/g)
  if (urlMatch) {
    for (const url of urlMatch) {
      const params = parseUrlParams(url)
      for (const [k, v] of Object.entries(params)) {
        const target = KEY_MAP[k.toLowerCase()]
        if (target && !out[target]) out[target] = v
      }
    }
  }

  // Has anything?
  const hasAny = Object.values(out).some((v) => v !== null)
  return hasAny ? out : null
}

// --- main ------------------------------------------------------------------

async function backfillTable(table) {
  console.log(`\n=== ${table} ===`)
  const rows = await sql.unsafe(`
    SELECT id, notes, "yclid", "gclid", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "referrer"
    FROM "${table}"
    WHERE notes IS NOT NULL
      AND ("yclid" IS NULL AND "gclid" IS NULL AND "utmSource" IS NULL)
    LIMIT 5000
  `)

  console.log(`  Candidates: ${rows.length}`)
  let updated = 0
  let withYclid = 0
  let withUtm = 0

  for (const row of rows) {
    const ext = extractFromNotes(row.notes)
    if (!ext) continue

    // Only set fields that are still NULL in the row
    const setFragments = []
    const setValues = {}
    for (const [k, v] of Object.entries(ext)) {
      if (v && !row[k]) {
        setFragments.push(`"${k}"`)
        setValues[k] = v
      }
    }
    if (setFragments.length === 0) continue

    const setClause = setFragments.map((f, i) => `${f} = $${i + 2}`).join(", ")
    const values = setFragments.map((f) => setValues[f.replace(/"/g, "")])
    await sql.unsafe(`UPDATE "${table}" SET ${setClause} WHERE id = $1`, [row.id, ...values])

    updated++
    if (ext.yclid) withYclid++
    if (ext.utmSource) withUtm++
  }

  console.log(`  Updated: ${updated} (yclid: ${withYclid}, utm_source: ${withUtm})`)
}

try {
  await backfillTable("GameLead")
  await backfillTable("Deal")
  console.log("\nDone.")
} catch (e) {
  console.error("Backfill failed:", e)
  process.exit(1)
} finally {
  await sql.end()
}
