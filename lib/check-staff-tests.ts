/**
 * Checks if a personnel member has passed all required knowledge base tests
 * for their role (animator, host, dj).
 *
 * Returns null if all tests passed, or an error message string if not.
 */
import { neon } from "@neondatabase/serverless"

export async function checkStaffTests(
  personnelId: string,
  role: string
): Promise<string | null> {
  // Only check for roles that require testing
  if (!["animator", "host", "dj"].includes(role)) {
    return null
  }

  const sql = neon(process.env.DATABASE_URL!)

  // Get personnel's userId
  const personnel = await sql`
    SELECT "userId" FROM "Personnel" WHERE id = ${personnelId}
  `
  if (personnel.length === 0 || !personnel[0].userId) {
    // No linked user account — can't verify tests, allow assignment
    return null
  }

  const userId = personnel[0].userId

  // Find all articles targeted at this role that have quizzes
  const requiredArticles = await sql`
    SELECT a.id, a.title, q.id as "quizId"
    FROM "KnowledgeArticle" a
    JOIN "KnowledgeQuiz" q ON q."articleId" = a.id
    WHERE a."targetRole" = ${role}
  `

  if (requiredArticles.length === 0) {
    // No required articles with quizzes for this role
    return null
  }

  // Check which quizzes the user has passed
  const passedQuizzes = await sql`
    SELECT DISTINCT "quizId"
    FROM "QuizAttempt"
    WHERE "userId" = ${userId} AND passed = true
  `

  const passedQuizIds = new Set(passedQuizzes.map((r: any) => r.quizId))

  const failedArticles = requiredArticles.filter(
    (a: any) => !passedQuizIds.has(a.quizId)
  )

  if (failedArticles.length === 0) {
    return null
  }

  return "Сотрудник не прошёл тесты в нужных статьях"
}
