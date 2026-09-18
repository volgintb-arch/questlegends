import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: articleId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const quizRows = await sql`
      SELECT id, "articleId", title, "passingScore", "createdAt"
      FROM "KnowledgeQuiz"
      WHERE "articleId" = ${articleId}
    `

    if (quizRows.length === 0) {
      return NextResponse.json({ quiz: null, userAttempts: [] })
    }

    const quiz = quizRows[0]
    const isUK = ["uk", "uk_employee"].includes(user.role)

    let questions
    if (isUK) {
      questions = await sql`
        SELECT id, text, options, "correctIndex", "order"
        FROM "QuizQuestion"
        WHERE "quizId" = ${quiz.id}
        ORDER BY "order" ASC
      `
    } else {
      questions = await sql`
        SELECT id, text, options, "order"
        FROM "QuizQuestion"
        WHERE "quizId" = ${quiz.id}
        ORDER BY "order" ASC
      `
    }

    const userAttempts = await sql`
      SELECT id, score, passed, "createdAt"
      FROM "QuizAttempt"
      WHERE "quizId" = ${quiz.id} AND "userId" = ${user.userId}
      ORDER BY "createdAt" DESC
    `

    return NextResponse.json({
      quiz: { ...quiz, questions },
      userAttempts,
    })
  } catch (error: any) {
    console.error("[knowledge/quiz] GET error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["uk", "uk_employee"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: articleId } = await params
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const { title, passingScore, questions } = body

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Title and questions are required" }, { status: 400 })
    }

    // Validate questions server-side: the client used to drop empty options
    // without re-mapping correctIndex, so the "right" answer silently shifted.
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const options = Array.isArray(q?.options) ? q.options.filter((o: unknown) => typeof o === "string" && o.trim()) : []
      const idx = Number(q?.correctIndex)
      if (!q?.text || typeof q.text !== "string" || !q.text.trim()) {
        return NextResponse.json({ error: `Вопрос ${i + 1}: пустой текст` }, { status: 400 })
      }
      if (options.length < 2) {
        return NextResponse.json({ error: `Вопрос ${i + 1}: нужно минимум два варианта ответа` }, { status: 400 })
      }
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
        return NextResponse.json({ error: `Вопрос ${i + 1}: правильный ответ не указывает на существующий вариант` }, { status: 400 })
      }
      questions[i] = { text: q.text.trim(), options, correctIndex: idx }
    }

    const score = Number(passingScore)
    const normalizedPassingScore = Number.isFinite(score) && score >= 1 && score <= 100 ? Math.round(score) : 70

    // Update in place. The previous implementation deleted the quiz and
    // re-created it, which cascaded to QuizAttempt and wiped every employee's
    // results whenever a typo was fixed. Keeping the quiz id keeps the history.
    const existing = await sql`SELECT id FROM "KnowledgeQuiz" WHERE "articleId" = ${articleId} LIMIT 1`
    let quizId: string
    if (existing.length > 0) {
      quizId = existing[0].id
      await sql`
        UPDATE "KnowledgeQuiz"
        SET title = ${title}, "passingScore" = ${normalizedPassingScore}, "updatedAt" = NOW()
        WHERE id = ${quizId}
      `
      await sql`DELETE FROM "QuizQuestion" WHERE "quizId" = ${quizId}`
    } else {
      quizId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "KnowledgeQuiz" (id, "articleId", title, "passingScore", "createdById", "createdAt", "updatedAt")
        VALUES (${quizId}, ${articleId}, ${title}, ${normalizedPassingScore}, ${user.userId}, NOW(), NOW())
      `
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const qId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "QuizQuestion" (id, "quizId", text, options, "correctIndex", "order", "createdAt")
        VALUES (${qId}, ${quizId}, ${q.text}, ${q.options}, ${q.correctIndex}, ${i}, NOW())
      `
    }

    return NextResponse.json({ success: true, quizId }, { status: existing.length > 0 ? 200 : 201 })
  } catch (error: any) {
    console.error("[knowledge/quiz] POST error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["uk", "uk_employee"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: articleId } = await params
    const sql = neon(process.env.DATABASE_URL!)

    await sql`DELETE FROM "KnowledgeQuiz" WHERE "articleId" = ${articleId}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[knowledge/quiz] DELETE error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
