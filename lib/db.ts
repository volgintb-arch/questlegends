import { neon } from "@/lib/neon-compat"

// Singleton SQL tagged-template function compatible with neon-compat proxy.
// All callers can use: sql`SELECT * FROM "User" WHERE id = ${id}`
const sqlInstance = neon(process.env.DATABASE_URL!)

export const sql = sqlInstance
export default sql
