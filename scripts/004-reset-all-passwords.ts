import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

async function resetAllPasswords() {
  const password = "admin123"

  // Generate proper bcrypt hash
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)

  console.log("[v0] Generated password hash for 'admin123':", passwordHash)

  // Verify hash works
  const isValid = await bcrypt.compare(password, passwordHash)
  console.log("[v0] Hash verification:", isValid ? "VALID" : "INVALID")

  if (!isValid) {
    console.error("[v0] Hash verification failed!")
    return
  }

  // Update all users with the new password hash
  const result = await sql`
    UPDATE "User" 
    SET "passwordHash" = ${passwordHash}
    WHERE "isActive" = true
    RETURNING id, name, phone
  `

  console.log("[v0] Updated passwords for users:")
  result.forEach((user: any) => {
    console.log(`  - ${user.name} (${user.phone})`)
  })

  console.log("\n[v0] All passwords have been reset to 'admin123'")
}

resetAllPasswords()
  .then(() => console.log("[v0] Script completed successfully"))
  .catch((err) => console.error("[v0] Script error:", err))
