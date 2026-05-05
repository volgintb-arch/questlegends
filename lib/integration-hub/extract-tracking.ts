/**
 * Defensive extraction of ad-tracking parameters (yclid, gclid, utm_*, referrer)
 * from arbitrary webhook payloads — Marquiz, Tilda, Avito, generic forms.
 *
 * Webhook payload shapes vary widely and providers occasionally rename or
 * reshape fields, so we try a list of well-known paths for each parameter.
 * If a future payload puts a yclid in an unexpected place, the raw payload
 * gets saved into IncomingPayloadLog so we can extend `paths` based on real data.
 */

export interface TrackingData {
  yclid: string | null
  gclid: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  referrer: string | null
}

function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

function firstNonEmpty(payload: any, paths: string[]): string | null {
  for (const path of paths) {
    const val = getByPath(payload, path)
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim()
    }
  }
  return null
}

/**
 * Some providers pass URL params as a single query-string ("utm_source=..&yclid=..").
 * We try to parse it and probe individual keys.
 */
function tryParseQueryString(payload: any, paths: string[]): URLSearchParams | null {
  for (const path of paths) {
    const val = getByPath(payload, path)
    if (typeof val === "string" && val.includes("=")) {
      try {
        return new URLSearchParams(val.startsWith("?") ? val.slice(1) : val)
      } catch {
        // ignore
      }
    }
  }
  return null
}

export function extractTracking(payload: any): TrackingData {
  if (!payload || typeof payload !== "object") {
    return {
      yclid: null,
      gclid: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      referrer: null,
    }
  }

  // Try parsing referrer URL — if it contains tracking params they take priority
  const referrerStr = firstNonEmpty(payload, [
    "referrer",
    "referer",
    "headers.referer",
    "lead.referrer",
    "data.referrer",
    "meta.referrer",
    "tracking.referrer",
  ])

  let referrerParams: URLSearchParams | null = null
  if (referrerStr) {
    try {
      referrerParams = new URL(referrerStr).searchParams
    } catch {
      // not a valid URL, ignore
    }
  }

  // Some webhooks pack everything into a query string field
  const qs = tryParseQueryString(payload, [
    "urlParams",
    "url_params",
    "queryString",
    "query_string",
    "params",
    "data.params",
    "lead.urlParams",
  ])

  function pick(name: string, paths: string[]): string | null {
    return (
      firstNonEmpty(payload, paths) ||
      qs?.get(name) ||
      referrerParams?.get(name) ||
      null
    )
  }

  return {
    yclid: pick("yclid", [
      "yclid",
      "Yclid",
      "YCLID",
      "urlParams.yclid",
      "url_params.yclid",
      "data.yclid",
      "params.yclid",
      "tracking.yclid",
      "formData.yclid",
      "form_data.yclid",
      "meta.yclid",
      "lead.yclid",
      "lead.urlParams.yclid",
      "lead.tracking.yclid",
      "utm.yclid",
      "query.yclid",
      "fields.yclid",
      "answers.yclid",
    ]),
    gclid: pick("gclid", [
      "gclid",
      "Gclid",
      "GCLID",
      "urlParams.gclid",
      "url_params.gclid",
      "data.gclid",
      "params.gclid",
      "tracking.gclid",
      "formData.gclid",
      "form_data.gclid",
      "meta.gclid",
      "lead.gclid",
      "lead.urlParams.gclid",
      "lead.tracking.gclid",
      "utm.gclid",
      "query.gclid",
      "fields.gclid",
    ]),
    utmSource: pick("utm_source", [
      "utm_source",
      "utmSource",
      "urlParams.utm_source",
      "data.utm_source",
      "params.utm_source",
      "tracking.utm_source",
      "tracking.source",
      "utm.source",
      "lead.utm_source",
    ]),
    utmMedium: pick("utm_medium", [
      "utm_medium",
      "utmMedium",
      "urlParams.utm_medium",
      "data.utm_medium",
      "params.utm_medium",
      "tracking.utm_medium",
      "tracking.medium",
      "utm.medium",
      "lead.utm_medium",
    ]),
    utmCampaign: pick("utm_campaign", [
      "utm_campaign",
      "utmCampaign",
      "urlParams.utm_campaign",
      "data.utm_campaign",
      "params.utm_campaign",
      "tracking.utm_campaign",
      "tracking.campaign",
      "utm.campaign",
      "lead.utm_campaign",
    ]),
    utmContent: pick("utm_content", [
      "utm_content",
      "utmContent",
      "urlParams.utm_content",
      "data.utm_content",
      "params.utm_content",
      "tracking.utm_content",
      "tracking.content",
      "utm.content",
      "lead.utm_content",
    ]),
    utmTerm: pick("utm_term", [
      "utm_term",
      "utmTerm",
      "urlParams.utm_term",
      "data.utm_term",
      "params.utm_term",
      "tracking.utm_term",
      "tracking.term",
      "utm.term",
      "lead.utm_term",
    ]),
    referrer: referrerStr,
  }
}
