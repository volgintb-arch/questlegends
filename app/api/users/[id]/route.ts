import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { logAuditEvent } from "@/lib/audit-log"
import { cache } from "@/lib/cache"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

// Safe user fields — never include passwordHash or password columns
const USER_SAFE_FIELDS = `
  u.id, u.phone, u.email, u.name, u.role, u.telegram, u.whatsapp,
  u."telegramId", u.description, u."avatarUrl", u."isActive", u."franchiseeId", u."createdAt", u."updatedAt",
  f.name as "franchiseeName"
`

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const users = await sql`
      SELECT ${sql.unsafe(USER_SAFE_FIELDS)}
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.id = ${id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: users[0] })
  } catch (error) {
    console.error("[users/id] GET error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await verifyRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL!)

    // Fetch only needed fields to check permissions
    const existing = await sql`
      SELECT id, role, "franchiseeId" FROM "User" WHERE id = ${id}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const targetUser = existing[0]
    const isSelfEdit = currentUser.userId === id
    const canEdit =
      isSelfEdit ||
      currentUser.role === "super_admin" ||
      currentUser.role === "uk" ||
      (currentUser.role === "uk_employee" && ["franchisee", "admin", "employee", "animator", "host", "dj"].includes(targetUser.role)) ||
      (currentUser.role === "franchisee" &&
        targetUser.franchiseeId === currentUser.franchiseeId &&
        ["admin", "employee", "animator", "host", "dj"].includes(targetUser.role))

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // A password change is validated here, before the first UPDATE: every field
    // below is written by its own statement, so a late 403 would leave the form
    // half-applied (name/phone saved, "error" shown).
    const wantsPasswordChange =
      typeof body.password === "string" && body.password.trim() !== "" && body.password.length >= 8
    if (wantsPasswordChange) {
      if (isSelfEdit) {
        // Own password: current password is required
        if (!body.currentPassword) {
          return NextResponse.json({ error: "Текущий пароль обязателен" }, { status: 400 })
        }
        const userWithHash = await sql`SELECT "passwordHash" FROM "User" WHERE id = ${id}`
        const isValid = await bcrypt.compare(body.currentPassword, userWithHash[0]?.passwordHash || "")
        if (!isValid) {
          return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 })
        }
      } else {
        // Someone else's password. Access to an account is access to its money,
        // so this is narrower than canEdit: UK owners for anyone, a franchisee
        // for their own staff. uk_employee (hired staff, not an owner) may not
        // reset a franchisee's password and then log in as them.
        const isUkOwner = currentUser.role === "uk" || currentUser.role === "super_admin"
        const isOwnStaff =
          (currentUser.role === "franchisee" || currentUser.role === "own_point") &&
          !!currentUser.franchiseeId &&
          targetUser.franchiseeId === currentUser.franchiseeId &&
          ["admin", "employee", "animator", "host", "dj"].includes(targetUser.role)
        if (!isUkOwner && !isOwnStaff) {
          return NextResponse.json({ error: "Недостаточно прав для смены пароля этого пользователя" }, { status: 403 })
        }
      }
    }

    // Self-edit: only allow name, phone, email, telegram fields
    // Managers can also change role, isActive, password
    if (body.name !== undefined) {
      await sql`UPDATE "User" SET name = ${body.name}, "updatedAt" = NOW() WHERE id = ${id}`
      await sql`UPDATE "Personnel" SET name = ${body.name} WHERE "userId" = ${id}`
    }
    if (body.phone !== undefined) {
      await sql`UPDATE "User" SET phone = ${body.phone}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.email !== undefined) {
      await sql`UPDATE "User" SET email = ${body.email}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.telegramId !== undefined) {
      await sql`UPDATE "User" SET "telegramId" = ${body.telegramId}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.telegram !== undefined) {
      await sql`UPDATE "User" SET telegram = ${body.telegram}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.description !== undefined) {
      await sql`UPDATE "User" SET description = ${body.description}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (body.avatarUrl !== undefined) {
      await sql`UPDATE "User" SET "avatarUrl" = ${body.avatarUrl}, "updatedAt" = NOW() WHERE id = ${id}`
    }

    // Role/active/franchisee changes are manager-only (not self-edit)
    if (!isSelfEdit) {
      if (body.role !== undefined) {
        const personnelRoles = ["animator", "host", "dj"]
        const requestedRole = body.role

        // Privilege escalation guard: the caller may only assign roles that
        // are below their own level. Mirrors the rule already enforced in
        // POST /api/users; PATCH was missing it entirely.
        const assignableRoles: Record<string, string[]> = {
          uk: ["franchisee", "own_point", "uk_employee", "admin", "employee", "animator", "host", "dj"],
          super_admin: ["franchisee", "own_point", "uk_employee", "admin", "employee", "animator", "host", "dj"],
          uk_employee: ["franchisee", "own_point", "admin", "employee", "animator", "host", "dj"],
          franchisee: ["admin", "employee", "animator", "host", "dj"],
          own_point: ["admin", "employee", "animator", "host", "dj"],
          admin: ["employee", "animator", "host", "dj"],
        }
        // DB Role enum only has: uk, uk_employee, franchisee, admin, employee
        const dbRole = personnelRoles.includes(requestedRole) ? "employee" : requestedRole
        // The edit form always echoes the current role back; only an actual
        // change is subject to the allow-list. An empty role is ignored.
        // A personnel role (animator/host/dj) always counts as a change: the DB
        // role stays "employee" but Personnel.role must still be updated.
        const roleChanges =
          typeof requestedRole === "string" &&
          requestedRole !== "" &&
          (dbRole !== targetUser.role || personnelRoles.includes(requestedRole))
        if (roleChanges) {
          const allowed = assignableRoles[currentUser.role] || []
          if (!allowed.includes(requestedRole)) {
            return NextResponse.json({ error: "Недостаточно прав для назначения этой роли" }, { status: 403 })
          }
          await sql`UPDATE "User" SET role = ${dbRole}, "updatedAt" = NOW() WHERE id = ${id}`

          // Manage Personnel record for animator/host/dj — ONLY when the role
          // actually changes. Previously this ran on every edit: the form
          // echoes the DB role ("employee") for an animator, which is not in
          // personnelRoles, so editing an animator's phone deleted their
          // Personnel row and (via cascade) their game assignments.
          const userFranchiseeId = targetUser.franchiseeId || currentUser.franchiseeId
          if (personnelRoles.includes(requestedRole) && userFranchiseeId) {
            const existingPersonnel = await sql`SELECT id FROM "Personnel" WHERE "userId" = ${id}`
            if (existingPersonnel.length > 0) {
              await sql`UPDATE "Personnel" SET role = ${requestedRole}, name = ${body.name || targetUser.name || ''} WHERE "userId" = ${id}`
            } else {
              const personnelId = uuidv4()
              const userName = body.name || (await sql`SELECT name, phone, telegram, whatsapp FROM "User" WHERE id = ${id}`)[0]
              await sql`
                INSERT INTO "Personnel" (id, "franchiseeId", name, role, phone, telegram, whatsapp, "userId")
                VALUES (${personnelId}, ${userFranchiseeId}, ${userName?.name || ''}, ${requestedRole}, ${userName?.phone || null}, ${userName?.telegram || null}, ${userName?.whatsapp || null}, ${id})
              `
            }
          } else if (!personnelRoles.includes(requestedRole)) {
            // Changed away from personnel role — remove Personnel record
            await sql`DELETE FROM "Personnel" WHERE "userId" = ${id}`
          }
        }
      }
      if (body.isActive !== undefined) {
        await sql`UPDATE "User" SET "isActive" = ${body.isActive}, "updatedAt" = NOW() WHERE id = ${id}`
        // Sync Personnel isActive
        await sql`UPDATE "Personnel" SET "isActive" = ${body.isActive} WHERE "userId" = ${id}`
      }
      if (body.franchiseeId !== undefined) {
        // Moving a user between franchisees is a UK-owner operation.
        // Other managers may send the field back unchanged (form round-trip) but
        // may not change it — that would be a cross-tenant transfer.
        const isUkOwner = currentUser.role === "uk" || currentUser.role === "super_admin"
        const unchanged = (body.franchiseeId || null) === (targetUser.franchiseeId || null)
        if (!isUkOwner && !unchanged) {
          return NextResponse.json({ error: "Недостаточно прав для смены франшизы" }, { status: 403 })
        }
        if (isUkOwner) {
          await sql`UPDATE "User" SET "franchiseeId" = ${body.franchiseeId}, "updatedAt" = NOW() WHERE id = ${id}`
        }
      }
    }

    if (wantsPasswordChange) {
      // Permission and current-password checks were done above, before any UPDATE.
      const hashedPassword = await bcrypt.hash(body.password, 12)
      await sql`UPDATE "User" SET "passwordHash" = ${hashedPassword}, "updatedAt" = NOW() WHERE id = ${id}`
      if (!isSelfEdit) {
        await logAuditEvent({
          action: "user_updated",
          entityType: "user",
          entityId: id,
          userId: currentUser.userId,
          userName: currentUser.name,
          userRole: currentUser.role,
          franchiseeId: currentUser.franchiseeId || null,
          details: { change: "password_reset_by_manager", targetRole: targetUser.role },
        })
      }
    }

    const updated = await sql`
      SELECT ${sql.unsafe(USER_SAFE_FIELDS)}
      FROM "User" u
      LEFT JOIN "Franchisee" f ON u."franchiseeId" = f.id
      WHERE u.id = ${id}
    `
    return NextResponse.json({ success: true, data: updated[0] })
  } catch (error: any) {
    console.error("[users/id] PATCH error:", error?.message || error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await verifyRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sql = neon(process.env.DATABASE_URL!)

    const existing = await sql`
      SELECT id, role, name, "franchiseeId" FROM "User" WHERE id = ${id}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const targetUser = existing[0]
    const canDelete =
      currentUser.role === "super_admin" ||
      currentUser.role === "uk" ||
      (currentUser.role === "uk_employee" && ["franchisee", "admin", "employee", "animator", "host", "dj"].includes(targetUser.role)) ||
      (currentUser.role === "franchisee" &&
        targetUser.franchiseeId === currentUser.franchiseeId &&
        ["admin", "employee", "animator", "host", "dj"].includes(targetUser.role))

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Nullify Deal.responsibleId to avoid FK violation on user deletion
    await sql`UPDATE "Deal" SET "responsibleId" = NULL WHERE "responsibleId" = ${id}`

    if (targetUser.role === 'franchisee' && targetUser.franchiseeId) {
      // Deleting a franchisee-role user: also delete the entire Franchisee
      const franchiseeId = targetUser.franchiseeId

      // 1. Nullify franchiseeId for all users linked to this franchisee (remove FK constraint)
      await sql`UPDATE "User" SET "franchiseeId" = NULL WHERE "franchiseeId" = ${franchiseeId}`

      // 2. Delete the Franchisee — PostgreSQL cascades handle:
      //    Personnel, Deals, Transactions, Expenses, Shifts, FranchiseeKPI,
      //    Alerts, GamePipelines, GameLeads, GameSchedules, Games, etc.
      await sql`DELETE FROM "Franchisee" WHERE id = ${franchiseeId}`

      // Invalidate franchisees cache so dashboard updates immediately
      await cache.invalidatePattern("franchisees:")
    } else {
      // Non-franchisee user: delete Personnel record (cascades to GameScheduleStaff, GameStaff, Shift)
      await sql`DELETE FROM "Personnel" WHERE "userId" = ${id}`
    }

    await sql`DELETE FROM "User" WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[users/id] DELETE error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
