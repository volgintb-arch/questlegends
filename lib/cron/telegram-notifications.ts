/**
 * This file should be deployed as a Vercel Cron Job
 * Configure in vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/notifications/send",
 *       "schedule": "0 9 * * *"
 *     }
 *   ]
 * }
 */

export async function sendTwoDaysBeforeNotifications() {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/notifications/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.INTERNAL_API_KEY!,
    },
    body: JSON.stringify({ type: "TWO_DAYS_BEFORE" }),
  })

  return response.json()
}

export async function sendAfterGameNotifications() {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/notifications/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.INTERNAL_API_KEY!,
    },
    body: JSON.stringify({ type: "AFTER_GAME" }),
  })

  return response.json()
}
