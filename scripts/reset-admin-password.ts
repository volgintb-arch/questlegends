import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

async function resetAdminPassword() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("DATABASE_URL not set")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  // Generate proper bcrypt hash for "admin123"
  const password = "admin123"
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)

  console.log("Generated hash:", hash)

  // Update super admin password
  await sql`
    UPDATE "User" 
    SET "passwordHash" = ${hash}
    WHERE phone = '+79000000000'
  `

  console.log("Super admin password updated successfully!")

  // Verify the update
  const user = await sql`
    SELECT id, phone, name, role, "passwordHash" 
    FROM "User" 
    WHERE phone = '+79000000000'
  `

  if (user.length > 0) {
    console.log("User found:", user[0].name)

    // Test password verification
    const isValid = await bcrypt.compare(password, user[0].passwordHash)
    console.log("Password verification test:", isValid ? "PASSED" : "FAILED")
  }
}

resetAdminPassword().catch(console.error)
