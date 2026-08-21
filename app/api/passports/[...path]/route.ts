import { type NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/simple-auth"
import { signSeekerAdminJWT } from "@/lib/seeker-jwt"
import { sql } from "@/lib/db"

const UK_ROLES = new Set(["super_admin", "uk", "uk_employee"])

// Catch-all прокси к seeker'ским admin-эндпоинтам.
//   /api/passports/games              → GET  ${SEEKER}/api/admin/games
//   /api/passports/games/:id/reel     → PUT  ${SEEKER}/api/admin/games/:id/reel
//   /api/passports/passports?q=...    → GET  ${SEEKER}/api/admin/passports
//   /api/passports/metrics            → GET  ${SEEKER}/api/admin/metrics
//   /api/passports/reviews            → GET  ${SEEKER}/api/admin/reviews
//
// Кладём подписанный SEEKER_JWT_SECRET'ом JWT с ролью/franchiseeId
// пользователя, чтобы seeker мог применить свои access-правила.
// Всё что seeker вернёт (включая 404 если endpoint ещё не построен —
// M5) — пробрасываем к клиенту как есть.

const ALLOWED_METHODS = new Set(["GET", "PUT", "PATCH", "POST", "DELETE"])

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const user = await verifyRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const baseUrl = process.env.SEEKER_PASSPORT_URL
  if (!baseUrl) {
    return NextResponse.json({ error: "SEEKER_PASSPORT_URL is not set" }, { status: 500 })
  }
  if (!process.env.SEEKER_JWT_SECRET) {
    return NextResponse.json({ error: "SEEKER_JWT_SECRET is not set" }, { status: 500 })
  }

  const { path } = await ctx.params
  const subpath = (path || []).join("/")
  if (!subpath) {
    return NextResponse.json({ error: "Missing subpath" }, { status: 400 })
  }

  // Раздел «Паспорта» — франчайзи-специфичный (city-scoped). UK-роли
  // сюда не пускаем: у них нет города → скоупить нечем, seeker без
  // citySlug вернёт всё вперемешку.
  if (UK_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden for UK roles" }, { status: 403 })
  }

  const targetUrl = `${baseUrl}/api/admin/${subpath}${req.nextUrl.search || ""}`

  // Non-UK — citySlug обязателен, иначе seeker вернёт UK-wide (лик).
  let citySlug: string | null = null
  if (user.franchiseeId) {
    const [f] = await sql`SELECT "citySlug" FROM "Franchisee" WHERE id = ${user.franchiseeId} LIMIT 1`
    citySlug = f?.citySlug ?? null
  }
  if (!citySlug) {
    return NextResponse.json(
      {
        error:
          "Ваш аккаунт не привязан к франчайзи с указанным городом. Обратитесь к администратору.",
      },
      { status: 403 },
    )
  }

  const jwt = signSeekerAdminJWT({
    sub: user.userId,
    name: user.name,
    role: user.role,
    franchiseeId: user.franchiseeId ?? null,
    citySlug,
  })

  const method = req.method.toUpperCase()
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: `Method ${method} not allowed` }, { status: 405 })
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
    Accept: "application/json",
  }
  const contentType = req.headers.get("content-type")
  if (contentType) headers["Content-Type"] = contentType

  const hasBody = method !== "GET" && method !== "DELETE"
  const body = hasBody ? await req.arrayBuffer() : undefined

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? body : undefined,
      // Разумный timeout — админ-страница не должна висеть.
      signal: AbortSignal.timeout(15_000),
    })

    // Стримим ответ как есть — код, заголовки, тело.
    const respHeaders = new Headers()
    const upstreamContentType = upstream.headers.get("content-type")
    if (upstreamContentType) respHeaders.set("Content-Type", upstreamContentType)

    const respBody = await upstream.arrayBuffer()
    return new NextResponse(respBody, { status: upstream.status, headers: respHeaders })
  } catch (err: any) {
    // Timeout, DNS, ECONNREFUSED — понятная ошибка для UI, чтобы можно было
    // отличить «seeker недоступен» от «endpoint ещё не построен» (последнее
    // будет 404 в теле выше).
    return NextResponse.json(
      { error: "Upstream unreachable", details: String(err?.message ?? err) },
      { status: 502 },
    )
  }
}

export const GET = handle
export const PUT = handle
export const PATCH = handle
export const POST = handle
export const DELETE = handle
