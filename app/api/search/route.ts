import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/simple-auth"
import { sql } from "@/lib/db"

async function getCurrentUser(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    let token = authHeader?.replace("Bearer ", "")

    if (!token) {
      try {
        const cookieStore = await cookies()
        token = cookieStore.get("auth-token")?.value
      } catch {}
    }

    if (!token) return null
    const payload = await verifyToken(token)
    if (!payload) return null

    return {
      id: payload.userId as string,
      role: payload.role as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const searchPattern = `%${q}%`
    const results: any[] = []

    // Role-based search scoping
    const isUK = user.role === "uk" || user.role === "uk_employee"
    const isFranchisee = user.role === "franchisee"
    const isAdmin = user.role === "admin"

    // 1. Search B2B Deals (UK roles)
    if (isUK) {
      const deals = await sql`
        SELECT id, "clientName", "clientPhone", source, stage, city
        FROM "Deal"
        WHERE "clientName" ILIKE ${searchPattern}
           OR "clientPhone" ILIKE ${searchPattern}
           OR "clientEmail" ILIKE ${searchPattern}
           OR "contactName" ILIKE ${searchPattern}
           OR city ILIKE ${searchPattern}
        ORDER BY "createdAt" DESC
        LIMIT 5
      `
      for (const d of deals) {
        results.push({
          id: d.id,
          type: "deal",
          title: d.clientName || "Без имени",
          subtitle: [d.clientPhone, d.stage, d.city].filter(Boolean).join(" · "),
          url: `/crm?dealId=${d.id}`,
        })
      }
    }

    // 2. Search Game Leads (Franchisee/Admin)
    if (isFranchisee || isAdmin) {
      const franchiseeFilter = user.franchiseeId
        ? sql`AND gl."franchiseeId" = ${user.franchiseeId}`
        : sql``

      const gameLeads = await sql`
        SELECT gl.id, gl."clientName", gl."clientPhone", gl.source, gl."gameDate",
               gps.name as stage_name
        FROM "GameLead" gl
        LEFT JOIN "GamePipelineStage" gps ON gps.id = gl."stageId"
        WHERE (gl."clientName" ILIKE ${searchPattern}
           OR gl."clientPhone" ILIKE ${searchPattern}
           OR gl."clientEmail" ILIKE ${searchPattern})
        ${franchiseeFilter}
        ORDER BY gl."createdAt" DESC
        LIMIT 5
      `
      for (const g of gameLeads) {
        results.push({
          id: g.id,
          type: "deal",
          title: g.clientName || "Без имени",
          subtitle: [g.clientPhone, g.stage_name, g.gameDate ? new Date(g.gameDate).toLocaleDateString("ru") : null].filter(Boolean).join(" · "),
          url: `/games-crm?leadId=${g.id}`,
        })
      }
    }

    // 3. Search Transactions
    if (isUK || isFranchisee) {
      const txFilter = !isUK && user.franchiseeId
        ? sql`AND t."franchiseeId" = ${user.franchiseeId}`
        : sql``

      const transactions = await sql`
        SELECT t.id, t.description, t.amount, t.type, t.category, t.date
        FROM "Transaction" t
        WHERE (t.description ILIKE ${searchPattern}
           OR t.category ILIKE ${searchPattern})
        ${txFilter}
        ORDER BY t."createdAt" DESC
        LIMIT 5
      `
      for (const t of transactions) {
        const amountStr = t.amount ? `${Number(t.amount).toLocaleString("ru")} ₽` : ""
        results.push({
          id: t.id,
          type: "transaction",
          title: t.description || t.category || "Транзакция",
          subtitle: [amountStr, t.type, t.date ? new Date(t.date).toLocaleDateString("ru") : null].filter(Boolean).join(" · "),
          url: `/finance`,
        })
      }
    }

    // 4. Search Expenses
    if (isUK || isFranchisee || isAdmin) {
      const expFilter = !isUK && user.franchiseeId
        ? sql`AND e."franchiseeId" = ${user.franchiseeId}`
        : sql``

      const expenses = await sql`
        SELECT e.id, e.description, e.amount, e.category, e."expenseDate"
        FROM "Expense" e
        WHERE (e.description ILIKE ${searchPattern}
           OR e.category ILIKE ${searchPattern})
        ${expFilter}
        ORDER BY e."createdAt" DESC
        LIMIT 5
      `
      for (const e of expenses) {
        const amountStr = e.amount ? `${Number(e.amount).toLocaleString("ru")} ₽` : ""
        results.push({
          id: e.id,
          type: "expense",
          title: e.description || e.category || "Расход",
          subtitle: [amountStr, e.expenseDate ? new Date(e.expenseDate).toLocaleDateString("ru") : null].filter(Boolean).join(" · "),
          url: `/finance`,
        })
      }
    }

    // 5. Search Users/Personnel
    if (isUK || isFranchisee || isAdmin) {
      const userFilter = !isUK && user.franchiseeId
        ? sql`AND u."franchiseeId" = ${user.franchiseeId}`
        : sql``

      const users = await sql`
        SELECT u.id, u.name, u.phone, u.email, u.role
        FROM "User" u
        WHERE (u.name ILIKE ${searchPattern}
           OR u.phone ILIKE ${searchPattern}
           OR u.email ILIKE ${searchPattern})
        ${userFilter}
        ORDER BY u."createdAt" DESC
        LIMIT 5
      `
      for (const u of users) {
        results.push({
          id: u.id,
          type: "personnel",
          title: u.name || "Без имени",
          subtitle: [u.phone, u.role, u.email].filter(Boolean).join(" · "),
          url: `/users`,
        })
      }
    }

    // 6. Search Knowledge Articles
    {
      const articles = await sql`
        SELECT id, title, category, author
        FROM "KnowledgeArticle"
        WHERE title ILIKE ${searchPattern}
           OR category ILIKE ${searchPattern}
           OR content ILIKE ${searchPattern}
        ORDER BY "createdAt" DESC
        LIMIT 5
      `
      for (const a of articles) {
        results.push({
          id: a.id,
          type: "article",
          title: a.title,
          subtitle: [a.category, a.author].filter(Boolean).join(" · "),
          url: `/knowledge?articleId=${a.id}`,
        })
      }
    }

    // 7. Search Franchisees (UK only)
    if (isUK) {
      const franchisees = await sql`
        SELECT id, name, city, phone, email
        FROM "Franchisee"
        WHERE name ILIKE ${searchPattern}
           OR city ILIKE ${searchPattern}
           OR phone ILIKE ${searchPattern}
           OR email ILIKE ${searchPattern}
        ORDER BY "createdAt" DESC
        LIMIT 5
      `
      for (const f of franchisees) {
        results.push({
          id: f.id,
          type: "franchisee",
          title: f.name,
          subtitle: [f.city, f.phone].filter(Boolean).join(" · "),
          url: `/franchisees`,
        })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("[search] Error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
