import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

async function createSuperAdmin() {
  const sql = neon(process.env.DATABASE_URL!)

  // Generate proper bcrypt hash for password "admin123"
  const password = "admin123"
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  console.log("Generated hash:", hashedPassword)

  // Delete existing super admin if exists
  await sql`DELETE FROM "User" WHERE phone = '+79000000000'`

  // Create new super admin with proper hash
  await sql`
    INSERT INTO "User" (id, phone, name, role, "passwordHash", password, "isActive", "createdAt", "updatedAt")
    VALUES (
      'super-admin-001',
      '+79000000000',
      'Супер Администратор',
      'super_admin',
      ${hashedPassword},
      ${hashedPassword},
      true,
      NOW(),
      NOW()
    )
  `

  console.log("Super admin created successfully!")
  console.log("Phone: +79000000000")
  console.log("Password: admin123")

  // Verify
  const user = await sql`SELECT id, phone, name, role FROM "User" WHERE phone = '+79000000000'`
  console.log("Created user:", user[0])
}

createSuperAdmin().catch(console.error)
