import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { jwtVerify } from "jose"

const sql = neon(process.env.DATABASE_URL!)

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.substring(7)
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default-secret-key")
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.userId as string,
      name: payload.name as string,
      role: payload.role as string,
      franchiseeId: payload.franchiseeId as string | null,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const [game] = await sql`
      SELECT g.*, u.name as "responsibleName"
      FROM "GameLead" g
      LEFT JOIN "User" u ON g."responsibleId" = u.id
      WHERE g.id = ${id}
    `

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: game })
  } catch (error) {
    console.error("[v0] Error fetching game:", error)
    return NextResponse.json({ error: "Failed to fetch game" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await req.json()
    const user = await getCurrentUser(req)

    // Get current game state
    const [currentGame] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`
    if (!currentGame) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    // Get old stage name and type
    let oldStageName = ""
    let oldStageType = ""
    if (currentGame.stageId) {
      const [oldStage] = await sql`SELECT name, "stageType" FROM "GamePipelineStage" WHERE id = ${currentGame.stageId}`
      oldStageName = oldStage?.name || ""
      oldStageType = oldStage?.stageType || ""
    }

    const allowedFields = [
      "clientName",
      "clientPhone",
      "clientEmail",
      "gameDate",
      "gameTime",
      "playersCount",
      "pricePerPerson",
      "totalAmount",
      "prepayment",
      "notes",
      "source",
      "responsibleId",
      "stageId",
      "animatorsCount",
      "animatorRate",
      "hostsCount",
      "hostRate",
      "djsCount",
      "djRate",
    ]

    const oldPrepayment =
      currentGame.prepayment !== null && currentGame.prepayment !== undefined
        ? Number.parseFloat(String(currentGame.prepayment))
        : 0
    let newPrepayment = oldPrepayment

    const oldResponsibleId = currentGame.responsibleId

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        let value = body[field]

        if (field === "gameDate" && (value === "" || value === null)) {
          value = null
        }

        const oldValue = currentGame[field]
        if (oldValue !== value && field !== "stageId") {
          await sql`
            INSERT INTO "GameLeadLog" ("leadId", action, details, "pipelineId", "userId", "userName")
            VALUES (${id}, 'edit', ${`Изменено "${field}": ${oldValue || "пусто"} → ${value || "пусто"}`}, ${currentGame.pipelineId}, ${user?.id || null}, ${user?.name || null})
          `

          await sql`
            INSERT INTO "GameLeadEvent" ("leadId", type, content, "userId", "userName")
            VALUES (${id}, 'field_change', ${`Изменено поле "${field}": ${oldValue || "пусто"} → ${value || "пусто"}`}, ${user?.id || null}, ${user?.name || null})
          `
        }

        if (field === "clientName") {
          await sql`UPDATE "GameLead" SET "clientName" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "clientPhone") {
          await sql`UPDATE "GameLead" SET "clientPhone" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "clientEmail") {
          await sql`UPDATE "GameLead" SET "clientEmail" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "gameDate") {
          await sql`UPDATE "GameLead" SET "gameDate" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "gameTime") {
          await sql`UPDATE "GameLead" SET "gameTime" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "playersCount") {
          await sql`UPDATE "GameLead" SET "playersCount" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "pricePerPerson") {
          await sql`UPDATE "GameLead" SET "pricePerPerson" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "totalAmount") {
          await sql`UPDATE "GameLead" SET "totalAmount" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "prepayment") {
          newPrepayment = value !== null && value !== undefined && value !== "" ? Number.parseFloat(String(value)) : 0
          await sql`UPDATE "GameLead" SET "prepayment" = ${newPrepayment}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "notes") {
          await sql`UPDATE "GameLead" SET "notes" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "source") {
          await sql`UPDATE "GameLead" SET "source" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "responsibleId") {
          await sql`UPDATE "GameLead" SET "responsibleId" = ${value || null}, "updatedAt" = NOW() WHERE id = ${id}`

          if (value && value !== oldResponsibleId && value !== user?.id) {
            const notificationId = globalThis.crypto.randomUUID()
            const now = new Date().toISOString()

            await sql`
              INSERT INTO "Notification" (
                id, type, title, message, "senderId", "recipientId", "relatedDealId",
                "isRead", "isArchived", "createdAt", "updatedAt"
              )
              VALUES (
                ${notificationId}, 
                'deal', 
                'Назначение ответственным', 
                ${"Вы назначены ответственным за заявку: " + currentGame.clientName},
                ${user?.id || null},
                ${value},
                ${id},
                false,
                false,
                ${now},
                ${now}
              )
            `
          }
        } else if (field === "stageId") {
          await sql`UPDATE "GameLead" SET "stageId" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "animatorsCount") {
          await sql`UPDATE "GameLead" SET "animatorsCount" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "animatorRate") {
          await sql`UPDATE "GameLead" SET "animatorRate" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "hostsCount") {
          await sql`UPDATE "GameLead" SET "hostsCount" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "hostRate") {
          await sql`UPDATE "GameLead" SET "hostRate" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "djsCount") {
          await sql`UPDATE "GameLead" SET "djsCount" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "djRate") {
          await sql`UPDATE "GameLead" SET "djRate" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        }
      }
    }

    // Recalculate total if players or price changed
    if (body.playersCount !== undefined || body.pricePerPerson !== undefined) {
      const [current] = await sql`SELECT "playersCount", "pricePerPerson" FROM "GameLead" WHERE id = ${id}`
      const players = body.playersCount ?? current.playersCount ?? 1
      const price = body.pricePerPerson ?? current.pricePerPerson ?? 0
      const total = players * price
      await sql`UPDATE "GameLead" SET "totalAmount" = ${total}, "updatedAt" = NOW() WHERE id = ${id}`
    }

    if (body.prepayment !== undefined) {
      const [game] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`

      // Check if prepayment transaction exists
      const existingPrepay = await sql`
        SELECT id, amount FROM "Transaction" 
        WHERE "gameLeadId" = ${id} AND category = 'prepayment'
      `

      if (existingPrepay.length > 0) {
        if (newPrepayment > 0) {
          await sql`
            UPDATE "Transaction" 
            SET amount = ${newPrepayment}, 
                description = ${"Предоплата за игру: " + game.clientName}
            WHERE "gameLeadId" = ${id} AND category = 'prepayment'
          `
        } else {
          await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'prepayment'`
        }
      } else if (newPrepayment > 0) {
        await sql`
          INSERT INTO "Transaction" (
            id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt"
          ) VALUES (
            gen_random_uuid()::text,
            'income',
            ${newPrepayment},
            'prepayment',
            ${"Предоплата за игру: " + game.clientName},
            ${game.franchiseeId},
            ${id},
            ${game.gameDate || new Date().toISOString().split("T")[0]},
            NOW()
          )
        `
      }

      if (Math.abs(newPrepayment - oldPrepayment) > 0.01) {
        await sql`
          INSERT INTO "GameLeadEvent" ("leadId", type, content, "userId", "userName")
          VALUES (${id}, 'system', ${"Предоплата изменена: " + oldPrepayment + " → " + newPrepayment + " ₽"}, ${user?.id || null}, ${user?.name || null})
        `
      }
    }

    if (body.stageId && body.stageId !== currentGame.stageId) {
      // Get new stage info from database
      const [newStage] = await sql`SELECT name, "stageType" FROM "GamePipelineStage" WHERE id = ${body.stageId}`
      const newStageName = newStage?.name || body.stageName || ""
      const stageType = newStage?.stageType || body.stageType || ""

      await sql`
        INSERT INTO "GameLeadLog" ("leadId", action, "fromStageName", "toStageName", "fromStageId", "toStageId", "pipelineId", "userId", "userName")
        VALUES (${id}, 'move', ${oldStageName}, ${newStageName}, ${currentGame.stageId}, ${body.stageId}, ${currentGame.pipelineId}, ${user?.id || null}, ${user?.name || null})
      `

      await sql`
        INSERT INTO "GameLeadEvent" ("leadId", type, content, "userId", "userName")
        VALUES (${id}, 'system', ${"Перемещение: " + oldStageName + " → " + newStageName}, ${user?.id || null}, ${user?.name || null})
      `

      if (oldStageType === "scheduled" && stageType !== "scheduled") {
        await sql`DELETE FROM "GameScheduleStaff" WHERE "scheduleId" IN (SELECT id FROM "GameSchedule" WHERE "leadId" = ${id})`
        await sql`DELETE FROM "GameSchedule" WHERE "leadId" = ${id}`

        await sql`
          INSERT INTO "GameLeadLog" ("leadId", action, details, "pipelineId", "userId", "userName")
          VALUES (${id}, 'unschedule', 'Игра удалена из графика', ${currentGame.pipelineId}, ${user?.id || null}, ${user?.name || null})
        `
      }

      if (stageType === "scheduled") {
        const [game] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`

        const existing = await sql`SELECT id FROM "GameSchedule" WHERE "leadId" = ${id}`
        if (existing.length === 0) {
          await sql`
            INSERT INTO "GameSchedule" (id, "leadId", "franchiseeId", "gameDate", "gameTime", "clientName", "playersCount", "totalAmount", status, "createdAt")
            VALUES (
              gen_random_uuid(), 
              ${id}, 
              ${game.franchiseeId}, 
              ${game.gameDate || new Date().toISOString().split("T")[0]}, 
              ${game.gameTime || "14:00"}, 
              ${game.clientName || "Без имени"}, 
              ${game.playersCount || 0}, 
              ${game.totalAmount || 0}, 
              'scheduled',
              NOW()
            )
          `

          await sql`
            INSERT INTO "GameLeadLog" ("leadId", action, details, "pipelineId", "userId", "userName")
            VALUES (${id}, 'schedule', ${"Игра добавлена в график. Требуется: Аним: " + (game.animatorsCount || 0) + ", Вед: " + (game.hostsCount || 0) + ", DJ: " + (game.djsCount || 0)}, ${currentGame.pipelineId}, ${user?.id || null}, ${user?.name || null})
          `
        } else {
          await sql`
            UPDATE "GameSchedule" 
            SET "gameDate" = ${game.gameDate || new Date().toISOString().split("T")[0]},
                "gameTime" = ${game.gameTime || "14:00"},
                "clientName" = ${game.clientName || "Без имени"},
                "playersCount" = ${game.playersCount || 0},
                "totalAmount" = ${game.totalAmount || 0}
            WHERE "leadId" = ${id}
          `
        }
      }

      if (stageType === "completed") {
        const [game] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`

        await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category != 'prepayment'`

        const totalAmount = Number.parseFloat(game.totalAmount) || 0
        const prepayment = Number.parseFloat(game.prepayment) || 0
        const postpayment = totalAmount - prepayment

        const animatorsCost = (Number.parseInt(game.animatorsCount) || 0) * (Number.parseFloat(game.animatorRate) || 0)
        const hostsCost = (Number.parseInt(game.hostsCount) || 0) * (Number.parseFloat(game.hostRate) || 0)
        const djsCost = (Number.parseInt(game.djsCount) || 0) * (Number.parseFloat(game.djRate) || 0)
        const totalStaffCost = animatorsCost + hostsCost + djsCost

        const gameDate = game.gameDate || new Date().toISOString().split("T")[0]

        if (postpayment > 0) {
          await sql`
            INSERT INTO "Transaction" (
              id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt"
            ) VALUES (
              gen_random_uuid()::text,
              'income',
              ${postpayment},
              'postpayment',
              ${"Постоплата за игру: " + game.clientName + " (" + game.playersCount + " чел.)"},
              ${game.franchiseeId},
              ${id},
              ${gameDate},
              NOW()
            )
          `
        }

        if (totalStaffCost > 0) {
          await sql`
            INSERT INTO "Transaction" (
              id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt"
            ) VALUES (
              gen_random_uuid()::text,
              'expense',
              ${totalStaffCost},
              'fot',
              ${"ФОТ за игру: " + game.clientName + " (Аним: " + (game.animatorsCount || 0) + ", Вед: " + (game.hostsCount || 0) + ", DJ: " + (game.djsCount || 0) + ")"},
              ${game.franchiseeId},
              ${id},
              ${gameDate},
              NOW()
            )
          `
        }

        await sql`
          INSERT INTO "GameLeadLog" ("leadId", action, details, "pipelineId", "userId", "userName")
          VALUES (${id}, 'completed', ${"Игра завершена. Выручка: " + totalAmount + " ₽, ФОТ: " + totalStaffCost + " ₽"}, ${game.pipelineId}, ${user?.id || null}, ${user?.name || null})
        `
      }

      if (stageType !== "completed") {
        const [oldStage] = await sql`SELECT "stageType" FROM "GamePipelineStage" WHERE id = ${currentGame.stageId}`
        if (oldStage?.stageType === "completed") {
          await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category != 'prepayment'`
        }
      }
    }

    const [finalGame] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`
    return NextResponse.json({ success: true, data: finalGame })
  } catch (error) {
    console.error("[v0] Error updating game:", error)
    return NextResponse.json({ error: "Failed to update game" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const user = await getCurrentUser(req)

    const [game] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    // Log deletion
    await sql`
      INSERT INTO "GameLeadLog" ("leadId", action, details, "pipelineId", "userId", "userName")
      VALUES (${id}, 'delete', ${"Удаление заявки: " + game.clientName}, ${game.pipelineId}, ${user?.id || null}, ${user?.name || null})
    `

    // Delete related transactions
    await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id}`

    // Delete related data
    await sql`DELETE FROM "GameScheduleStaff" WHERE "scheduleId" IN (SELECT id FROM "GameSchedule" WHERE "leadId" = ${id})`
    await sql`DELETE FROM "GameSchedule" WHERE "leadId" = ${id}`
    await sql`DELETE FROM "GameLeadTask" WHERE "leadId" = ${id}`
    await sql`DELETE FROM "GameLeadEvent" WHERE "leadId" = ${id}`
    await sql`DELETE FROM "GameLead" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting game:", error)
    return NextResponse.json({ error: "Failed to delete game" }, { status: 500 })
  }
}
