import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyRequest } from "@/lib/simple-auth"

// GET /api/marketing/guests
//   ?citySlug=barnaul  (только для UK-ролей; для остальных — принудительно свой франчайзи)
//   ?daysMax=60        (фильтр «до ДР ≤ N дней»)
//   ?hasEmail=1
//   ?hasTg=1
//   ?format=csv        (скачать таблицу CSV с UTF-8 BOM для Excel)
//
// Гостей приносит seeker-passport через POST /api/seeker/clients — здесь мы
// их читаем для «Гостей» в разделе Маркетинг.

type GuestRow = {
  id: string
  phone: string
  childName: string
  childBirthdate: string | null
  email: string | null
  tgUserId: string | null
  passportNumber: string | null
  source: string
  citySlug: string | null
  franchiseeName: string | null
  attendancesCount: number
  createdAt: string
  daysUntilBirthday: number | null
}

function daysUntilBirthday(birthdateStr: string | null): number | null {
  if (!birthdateStr) return null
  const bd = new Date(birthdateStr)
  if (Number.isNaN(bd.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return Math.round((next.getTime() - today.getTime()) / 86_400_000)
}

function toCsv(rows: GuestRow[]): string {
  const header = [
    "Телефон",
    "Имя ребёнка",
    "ДР",
    "Дней до ДР",
    "Email",
    "TG userId",
    "Посещений",
    "Источник",
    "Город (slug)",
    "Франчайзи",
    "№ паспорта",
    "Создан",
  ]
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [header.join(",")]
  for (const r of rows) {
    lines.push(
      [
        r.phone,
        r.childName,
        r.childBirthdate ? String(r.childBirthdate).slice(0, 10) : "",
        r.daysUntilBirthday ?? "",
        r.email ?? "",
        r.tgUserId ?? "",
        r.attendancesCount,
        r.source,
        r.citySlug ?? "",
        r.franchiseeName ?? "",
        r.passportNumber ?? "",
        r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
      ]
        .map(escape)
        .join(","),
    )
  }
  // UTF-8 BOM — чтобы Excel правильно распознал кодировку.
  return "﻿" + lines.join("\r\n")
}

export async function GET(req: NextRequest) {
  const user = await verifyRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const format = sp.get("format")
  const citySlugParam = sp.get("citySlug")
  const daysMaxParam = sp.get("daysMax")
  const hasEmail = sp.get("hasEmail") === "1"
  const hasTg = sp.get("hasTg") === "1"

  const isUK = ["uk", "super_admin", "uk_employee"].includes(user.role)
  // Для не-UK ролей принудительно фильтруем по своему франчайзи (мульти-тенант
  // изоляция per SECURITY.md).
  const franchiseeIdFilter: string | null = isUK ? null : user.franchiseeId || null
  if (!isUK && !franchiseeIdFilter) {
    return NextResponse.json({ guests: [], total: 0 })
  }

  const citySlugFilter =
    isUK && citySlugParam && citySlugParam !== "all" ? citySlugParam : null

  // Три ветки, чтобы не смешивать sql-теги с условными where —
  // driver postgres не любит рантайм-склейку.
  const rawRows: any[] = franchiseeIdFilter
    ? await sql`
        SELECT
          c.id, c.phone, c."childName", c."childBirthdate",
          c.email, c."tgUserId", c."passportNumber",
          c.source, c."createdAt",
          f."citySlug", f.name AS "franchiseeName",
          COUNT(a.id)::int AS "attendancesCount"
        FROM "Client" c
        LEFT JOIN "Franchisee" f ON f.id = c."franchiseeId"
        LEFT JOIN "ClientAttendance" a ON a."clientId" = c.id
        WHERE c."franchiseeId" = ${franchiseeIdFilter}
        GROUP BY c.id, f."citySlug", f.name
        ORDER BY c."createdAt" DESC
      `
    : citySlugFilter
      ? await sql`
          SELECT
            c.id, c.phone, c."childName", c."childBirthdate",
            c.email, c."tgUserId", c."passportNumber",
            c.source, c."createdAt",
            f."citySlug", f.name AS "franchiseeName",
            COUNT(a.id)::int AS "attendancesCount"
          FROM "Client" c
          LEFT JOIN "Franchisee" f ON f.id = c."franchiseeId"
          LEFT JOIN "ClientAttendance" a ON a."clientId" = c.id
          WHERE f."citySlug" = ${citySlugFilter}
          GROUP BY c.id, f."citySlug", f.name
          ORDER BY c."createdAt" DESC
        `
      : await sql`
          SELECT
            c.id, c.phone, c."childName", c."childBirthdate",
            c.email, c."tgUserId", c."passportNumber",
            c.source, c."createdAt",
            f."citySlug", f.name AS "franchiseeName",
            COUNT(a.id)::int AS "attendancesCount"
          FROM "Client" c
          LEFT JOIN "Franchisee" f ON f.id = c."franchiseeId"
          LEFT JOIN "ClientAttendance" a ON a."clientId" = c.id
          GROUP BY c.id, f."citySlug", f.name
          ORDER BY c."createdAt" DESC
        `

  const daysMax = daysMaxParam ? Number(daysMaxParam) : null
  const daysMaxValid = daysMax != null && !Number.isNaN(daysMax)

  const guests: GuestRow[] = rawRows
    .map((r) => ({
      id: r.id,
      phone: r.phone,
      childName: r.childName,
      childBirthdate: r.childBirthdate,
      email: r.email,
      tgUserId: r.tgUserId,
      passportNumber: r.passportNumber,
      source: r.source,
      citySlug: r.citySlug,
      franchiseeName: r.franchiseeName,
      attendancesCount: r.attendancesCount,
      createdAt: r.createdAt,
      daysUntilBirthday: daysUntilBirthday(r.childBirthdate),
    }))
    .filter((r) => {
      if (hasEmail && !r.email) return false
      if (hasTg && !r.tgUserId) return false
      if (daysMaxValid) {
        if (r.daysUntilBirthday == null) return false
        if (r.daysUntilBirthday > (daysMax as number)) return false
      }
      return true
    })

  if (format === "csv") {
    const csv = toCsv(guests)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="guests-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  return NextResponse.json({ guests, total: guests.length })
}
