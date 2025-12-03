/**
 * Activity Service
 * Handles creation of deal activities and audit trail
 */

export interface CreateActivityInput {
  dealId: string
  type: "event" | "comment" | "message" | "task"
  userId: string
  userName: string
  content: string
  status?: "pending" | "completed" | "cancelled"
}

export interface Activity {
  id: string
  dealId: string
  type: string
  userId: string
  userName: string
  content: string
  status?: string
  createdAt: Date
}

/**
 * Create activity log entry for deal
 */
export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  const activity: Activity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    dealId: input.dealId,
    type: input.type,
    userId: input.userId,
    userName: input.userName,
    content: input.content,
    status: input.status || "pending",
    createdAt: new Date(),
  }

  // In real backend: INSERT INTO deal_activities (...) VALUES (...) RETURNING *
  console.log("[Activity Service] Created activity:", activity.id, activity.content)

  return activity
}
