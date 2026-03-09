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

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json({ error: "Title and questions are required" }, { status: 400 })
    }

    // Delete existing quiz for this article (cascade deletes questions and attempts)
    await sql`DELETE FROM "KnowledgeQuiz" WHERE "articleId" = ${articleId}`

    // Create new quiz
    const quizId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "KnowledgeQuiz" (id, "articleId", title, "passingScore", "createdById", "createdAt", "updatedAt")
      VALUES (${quizId}, ${articleId}, ${title}, ${passingScore || 70}, ${user.userId}, NOW(), NOW())
    `

    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const qId = globalThis.crypto.randomUUID()
      await sql`
        INSERT INTO "QuizQuestion" (id, "quizId", text, options, "correctIndex", "order", "createdAt")
        VALUES (${qId}, ${quizId}, ${q.text}, ${q.options}, ${q.correctIndex}, ${i}, NOW())
      `
    }

    return NextResponse.json({ success: true, quizId }, { status: 201 })
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
