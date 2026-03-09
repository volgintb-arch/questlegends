import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["uk", "uk_employee", "franchisee"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get("articleId")

    // For franchisees, only show results of their own staff
    let staffUserIds: string[] | null = null
    if (user.role === "franchisee") {
      const franchiseeRow = await sql`
        SELECT "franchiseeId" FROM "User" WHERE id = ${user.userId}
      `
      if (franchiseeRow.length > 0 && franchiseeRow[0].franchiseeId) {
        const staffRows = await sql`
          SELECT "userId" FROM "Personnel"
          WHERE "franchiseeId" = ${franchiseeRow[0].franchiseeId} AND "userId" IS NOT NULL
        `
        staffUserIds = staffRows.map((r: any) => r.userId)
      } else {
        staffUserIds = []
      }
    }

    if (articleId) {
      // Detailed stats for a specific article's quiz
      const quizRows = await sql`
        SELECT q.id, q.title, q."passingScore", q."articleId",
               a.title as "articleTitle"
        FROM "KnowledgeQuiz" q
        JOIN "KnowledgeArticle" a ON a.id = q."articleId"
        WHERE q."articleId" = ${articleId}
      `

      if (quizRows.length === 0) {
        return NextResponse.json({ stats: null, users: [] })
      }

      const quiz = quizRows[0]

      let userResults
      if (staffUserIds !== null) {
        // Franchisee: only their staff
        if (staffUserIds.length === 0) {
          userResults = []
        } else {
          userResults = await sql`
            SELECT qa.id, qa."userId", qa.score, qa.passed, qa."createdAt",
                   u.name as "userName", u.phone as "userPhone", u.role as "userRole"
            FROM "QuizAttempt" qa
            JOIN "User" u ON u.id = qa."userId"
            WHERE qa."quizId" = ${quiz.id} AND qa."userId" = ANY(${staffUserIds})
            ORDER BY qa."createdAt" DESC
          `
        }
      } else {
        userResults = await sql`
          SELECT qa.id, qa."userId", qa.score, qa.passed, qa."createdAt",
                 u.name as "userName", u.phone as "userPhone", u.role as "userRole"
          FROM "QuizAttempt" qa
          JOIN "User" u ON u.id = qa."userId"
          WHERE qa."quizId" = ${quiz.id}
          ORDER BY qa."createdAt" DESC
        `
      }

      return NextResponse.json({
        stats: {
          quizId: quiz.id,
          articleId: quiz.articleId,
          articleTitle: quiz.articleTitle,
          quizTitle: quiz.title,
          passingScore: quiz.passingScore,
          totalAttempts: userResults.length,
          passCount: userResults.filter((r: any) => r.passed).length,
          failCount: userResults.filter((r: any) => !r.passed).length,
        },
        users: userResults,
      })
    }

    // Summary stats for all quizzes
    let stats
    if (staffUserIds !== null) {
      // Franchisee: only stats from their staff
      if (staffUserIds.length === 0) {
        stats = await sql`
          SELECT q.id as "quizId", q."articleId", q.title as "quizTitle", q."passingScore",
                 a.title as "articleTitle",
                 0::int as "totalAttempts", 0::int as "passCount", 0::int as "failCount", 0::int as "avgScore"
          FROM "KnowledgeQuiz" q
          JOIN "KnowledgeArticle" a ON a.id = q."articleId"
          ORDER BY a.title ASC
        `
      } else {
        stats = await sql`
          SELECT q.id as "quizId", q."articleId", q.title as "quizTitle", q."passingScore",
                 a.title as "articleTitle",
                 COUNT(qa.id)::int as "totalAttempts",
                 COUNT(CASE WHEN qa.passed THEN 1 END)::int as "passCount",
                 COUNT(CASE WHEN NOT qa.passed THEN 1 END)::int as "failCount",
                 COALESCE(AVG(qa.score), 0)::int as "avgScore"
          FROM "KnowledgeQuiz" q
          JOIN "KnowledgeArticle" a ON a.id = q."articleId"
          LEFT JOIN "QuizAttempt" qa ON qa."quizId" = q.id AND qa."userId" = ANY(${staffUserIds})
          GROUP BY q.id, q."articleId", q.title, q."passingScore", a.title
          ORDER BY a.title ASC
        `
      }
    } else {
      stats = await sql`
        SELECT q.id as "quizId", q."articleId", q.title as "quizTitle", q."passingScore",
               a.title as "articleTitle",
               COUNT(qa.id)::int as "totalAttempts",
               COUNT(CASE WHEN qa.passed THEN 1 END)::int as "passCount",
               COUNT(CASE WHEN NOT qa.passed THEN 1 END)::int as "failCount",
               COALESCE(AVG(qa.score), 0)::int as "avgScore"
        FROM "KnowledgeQuiz" q
        JOIN "KnowledgeArticle" a ON a.id = q."articleId"
        LEFT JOIN "QuizAttempt" qa ON qa."quizId" = q.id
        GROUP BY q.id, q."articleId", q.title, q."passingScore", a.title
        ORDER BY a.title ASC
      `
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error("[knowledge/quiz-stats] GET error:", error?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
