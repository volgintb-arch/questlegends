import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: articleId } = await params
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const { answers } = body

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: "Answers must be an array" }, { status: 400 })
    }

    // Get quiz
    const quizRows = await sql`
      SELECT id, "passingScore" FROM "KnowledgeQuiz" WHERE "articleId" = ${articleId}
    `
    if (quizRows.length === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }
    const quiz = quizRows[0]

    // Get questions in order
    const questions = await sql`
      SELECT id, "correctIndex" FROM "QuizQuestion"
      WHERE "quizId" = ${quiz.id}
      ORDER BY "order" ASC
    `

    if (answers.length !== questions.length) {
      return NextResponse.json({ error: "Answer count does not match question count" }, { status: 400 })
    }

    // Score
    let correctCount = 0
    const correctAnswers: number[] = []
    for (let i = 0; i < questions.length; i++) {
      correctAnswers.push(questions[i].correctIndex)
      if (answers[i] === questions[i].correctIndex) {
        correctCount++
      }
    }

    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= quiz.passingScore

    // Save attempt
    const attemptId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "QuizAttempt" (id, "quizId", "userId", answers, score, passed, "createdAt")
      VALUES (${attemptId}, ${quiz.id}, ${user.userId}, ${answers}, ${score}, ${passed}, NOW())
    `

    // If passed, also mark article as completed
    if (passed) {
      const existing = await sql`
        SELECT id FROM "ArticleReadStatus"
        WHERE "articleId" = ${articleId} AND "userId" = ${user.userId}
      `
      if (existing.length > 0) {
        await sql`
          UPDATE "ArticleReadStatus"
          SET "isCompleted" = true, "completedAt" = NOW()
          WHERE "articleId" = ${articleId} AND "userId" = ${user.userId}
        `
      } else {
        const statusId = globalThis.crypto.randomUUID()
        await sql`
          INSERT INTO "ArticleReadStatus" (id, "articleId", "userId", "readAt", "isCompleted", "completedAt")
          VALUES (${statusId}, ${articleId}, ${user.userId}, NOW(), true, NOW())
        `
      }
    }

    return NextResponse.json({
      attempt: { id: attemptId, score, passed, createdAt: new Date().toISOString() },
      correctAnswers,
    })
  } catch (error: any) {
    console.error("[knowledge/quiz/submit] POST error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
