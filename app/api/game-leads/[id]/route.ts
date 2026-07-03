import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ukRoles = ["uk", "super_admin", "uk_employee"]

    const [game] = await sql`
      SELECT g.*, u.name as "responsibleName"
      FROM "GameLead" g
      LEFT JOIN "User" u ON g."responsibleId" = u.id
      WHERE g.id = ${id}
    `

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (!ukRoles.includes(user.role) && game.franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: game })
  } catch (error: any) {
    console.error("[v0] Error fetching game:")
    const errorMessage = error?.message || String(error)
    return NextResponse.json({ success: false, error: "Failed to fetch game", }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      "extraStaffCount",
      "extraStaffRate",
      "discount",
      "extras",
      "extrasAmount",
      "cancellationReason",
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

        // Validate gameDate: not earlier than 3 months ago
        if (field === "gameDate" && value) {
          const minDate = new Date()
          minDate.setMonth(minDate.getMonth() - 3)
          if (new Date(value) < minDate) {
            return NextResponse.json({ error: "Дата игры не может быть раньше чем 3 месяца назад" }, { status: 400 })
          }
        }

        const oldValue = currentGame[field]
        if (oldValue !== value && field !== "stageId") {
          await sql`
            INSERT INTO "GameLeadLog" (id, "leadId", action, details, "pipelineId", "userId", "userName", "franchiseeId", "clientName")
            VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'edit', ${`Изменено "${field}": ${oldValue || "пусто"} → ${value || "пусто"}`}, ${currentGame.pipelineId}, ${user?.userId || null}, ${user?.name || null}, ${currentGame.franchiseeId || null}, ${currentGame.clientName || null})
          `

          await sql`
            INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
            VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'field_change', ${`Изменено поле "${field}": ${oldValue || "пусто"} → ${value || "пусто"}`}, ${user?.userId || null}, ${user?.name || null})
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

          const scheduleUpdateResult = await sql`
            UPDATE "GameSchedule"
            SET "gameDate" = ${value}
            WHERE "leadId" = ${id}
            RETURNING id, "gameDate", "leadId"
          `
          console.log(
            `[v0] Synced gameDate to GameSchedule: ${scheduleUpdateResult.length} rows updated`,
            scheduleUpdateResult,
          )

          // Sync date to linked Transactions so financial reports reflect the correct period
          const txUpdateResult = await sql`
            UPDATE "Transaction"
            SET date = ${value}, "paymentDate" = ${value}
            WHERE "gameLeadId" = ${id}
            RETURNING id
          `
          if (txUpdateResult.length > 0) {
            console.log(`[v0] Synced gameDate to ${txUpdateResult.length} Transactions for lead ${id}`)
          }
        } else if (field === "gameTime") {
          await sql`UPDATE "GameLead" SET "gameTime" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`

          const scheduleUpdateResult = await sql`
            UPDATE "GameSchedule" 
            SET "gameTime" = ${value}
            WHERE "leadId" = ${id}
            RETURNING id, "gameTime", "leadId"
          `
          console.log(
            `[v0] Synced gameTime to GameSchedule: ${scheduleUpdateResult.length} rows updated`,
            scheduleUpdateResult,
          )
        } else if (field === "playersCount") {
          await sql`UPDATE "GameLead" SET "playersCount" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
          await sql`
            UPDATE "GameSchedule" 
            SET "playersCount" = ${value}
            WHERE "leadId" = ${id}
          `
        } else if (field === "pricePerPerson") {
          await sql`UPDATE "GameLead" SET "pricePerPerson" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "totalAmount") {
          await sql`UPDATE "GameLead" SET "totalAmount" = ${value}, "updatedAt" = NOW() WHERE id = ${id}`
          await sql`
            UPDATE "GameSchedule" 
            SET "totalAmount" = ${value}
            WHERE "leadId" = ${id}
          `
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
                ${user?.userId || null},
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
        } else if (field === "extraStaffCount") {
          await sql`UPDATE "GameLead" SET "extraStaffCount" = ${value || 0}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "extraStaffRate") {
          await sql`UPDATE "GameLead" SET "extraStaffRate" = ${value || 0}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "discount") {
          await sql`UPDATE "GameLead" SET "discount" = ${value || 0}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "extras") {
          await sql`UPDATE "GameLead" SET "extras" = ${value || null}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "extrasAmount") {
          await sql`UPDATE "GameLead" SET "extrasAmount" = ${value || 0}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "cancellationReason") {
          await sql`UPDATE "GameLead" SET "cancellationReason" = ${value || null}, "updatedAt" = NOW() WHERE id = ${id}`
        }
      }
    }

    // Stamp lifecycle timestamps when stage changes (для трекинга конверсий по yclid)
    if (body.stageId && body.stageId !== currentGame.stageId) {
      const [newStage] = await sql`SELECT "stageType" FROM "GamePipelineStage" WHERE id = ${body.stageId}`
      const stType = newStage?.stageType
      if (stType === "scheduled") {
        await sql`UPDATE "GameLead" SET "scheduledAt" = COALESCE("scheduledAt", NOW()) WHERE id = ${id}`
      } else if (stType === "completed") {
        await sql`UPDATE "GameLead" SET "completedAt" = COALESCE("completedAt", NOW()) WHERE id = ${id}`
      } else if (stType === "cancelled") {
        await sql`UPDATE "GameLead" SET "cancelledAt" = COALESCE("cancelledAt", NOW()) WHERE id = ${id}`
      }
    }

    // Recalculate total if players, price or discount changed
    if (body.playersCount !== undefined || body.pricePerPerson !== undefined || body.discount !== undefined) {
      const [current] = await sql`SELECT "playersCount", "pricePerPerson", "discount" FROM "GameLead" WHERE id = ${id}`
      const players = body.playersCount ?? current.playersCount ?? 1
      const price = body.pricePerPerson ?? current.pricePerPerson ?? 0
      const discount = body.discount ?? current.discount ?? 0
      const total = Math.max(0, players * price - discount)
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
            id, type, amount, category, description, "franchiseeId", "gameLeadId", "paymentMethod", date, "createdAt"
          ) VALUES (
            ${globalThis.crypto.randomUUID()},
            'income',
            ${newPrepayment},
            'prepayment',
            ${"Предоплата за игру: " + game.clientName},
            ${game.franchiseeId},
            ${id},
            ${game.paymentMethod || "cash"},
            ${game.gameDate || new Date().toISOString().split("T")[0]},
            NOW()
          )
        `
      }

      if (Math.abs(newPrepayment - oldPrepayment) > 0.01) {
        await sql`
          INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
          VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'system', ${"Предоплата изменена: " + oldPrepayment + " → " + newPrepayment + " ₽"}, ${user?.userId || null}, ${user?.name || null})
        `
      }
    }

    if (body.stageId && body.stageId !== currentGame.stageId) {
      // Get new stage info from database
      const [newStage] = await sql`SELECT name, "stageType" FROM "GamePipelineStage" WHERE id = ${body.stageId}`
      const newStageName = newStage?.name || body.stageName || ""
      const stageType = newStage?.stageType || body.stageType || ""

      await sql`
        INSERT INTO "GameLeadLog" (id, "leadId", action, "fromStageName", "toStageName", "fromStageId", "toStageId", "pipelineId", "userId", "userName", "franchiseeId", "clientName")
        VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'move', ${oldStageName}, ${newStageName}, ${currentGame.stageId}, ${body.stageId}, ${currentGame.pipelineId}, ${user?.userId || null}, ${user?.name || null}, ${currentGame.franchiseeId || null}, ${currentGame.clientName || null})
      `

      await sql`
        INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
        VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'system', ${"Перемещение: " + oldStageName + " → " + newStageName}, ${user?.userId || null}, ${user?.name || null})
      `

      if (oldStageType === "scheduled" && stageType !== "scheduled") {
        await sql`DELETE FROM "GameScheduleStaff" WHERE "scheduleId" IN (SELECT id FROM "GameSchedule" WHERE "leadId" = ${id})`
        await sql`DELETE FROM "GameSchedule" WHERE "leadId" = ${id}`

        await sql`
          INSERT INTO "GameLeadLog" (id, "leadId", action, details, "pipelineId", "userId", "userName", "franchiseeId", "clientName")
          VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'unschedule', 'Игра удалена из графика', ${currentGame.pipelineId}, ${user?.userId || null}, ${user?.name || null}, ${currentGame.franchiseeId || null}, ${currentGame.clientName || null})
        `
      }

      if (stageType === "scheduled") {
        const [game] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`

        const existing = await sql`SELECT id FROM "GameSchedule" WHERE "leadId" = ${id}`
        if (existing.length === 0) {
          await sql`
            INSERT INTO "GameSchedule" (id, "leadId", "franchiseeId", "gameDate", "gameTime", "clientName", "playersCount", "createdAt")
            VALUES (
              ${globalThis.crypto.randomUUID()},
              ${id},
              ${game.franchiseeId},
              ${game.gameDate || new Date().toISOString().split("T")[0]},
              ${game.gameTime || "14:00"},
              ${game.clientName || "Без имени"},
              ${game.playersCount || 0},
              NOW()
            )
          `

          await sql`
            INSERT INTO "GameLeadLog" (id, "leadId", action, details, "pipelineId", "userId", "userName", "franchiseeId", "clientName")
            VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'schedule', ${"Игра добавлена в график. Требуется: Аним: " + (game.animatorsCount || 0) + ", Вед: " + (game.hostsCount || 0) + ", DJ: " + (game.djsCount || 0)}, ${currentGame.pipelineId}, ${user?.userId || null}, ${user?.name || null}, ${currentGame.franchiseeId || null}, ${currentGame.clientName || null})
          `
        } else {
          await sql`
            UPDATE "GameSchedule"
            SET "gameDate" = ${game.gameDate || new Date().toISOString().split("T")[0]},
                "gameTime" = ${game.gameTime || "14:00"},
                "clientName" = ${game.clientName || "Без имени"},
                "playersCount" = ${game.playersCount || 0}
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
        const extraStaffCost = (Number.parseInt(game.extraStaffCount) || 0) * (Number.parseFloat(game.extraStaffRate) || 0)
        const totalStaffCost = animatorsCost + hostsCost + djsCost + extraStaffCost

        const gameDate = game.gameDate || new Date().toISOString().split("T")[0]

        if (postpayment > 0) {
          await sql`
            INSERT INTO "Transaction" (
              id, type, amount, category, description, "franchiseeId", "gameLeadId", "paymentMethod", date, "createdAt"
            ) VALUES (
              ${globalThis.crypto.randomUUID()},
              'income',
              ${postpayment},
              'postpayment',
              ${"Постоплата за игру: " + game.clientName + " (" + game.playersCount + " чел.)"},
              ${game.franchiseeId},
              ${id},
              ${game.paymentMethod || "cash"},
              ${gameDate},
              NOW()
            )
          `
        }

        // Create extras transactions (supports JSON array or legacy string)
        const extrasAmt = Number.parseInt(game.extrasAmount) || 0
        if (extrasAmt > 0 && game.extras) {
          let extrasItems: { name: string; amount: number }[] = []
          try {
            const parsed = JSON.parse(game.extras)
            if (Array.isArray(parsed)) extrasItems = parsed
          } catch {
            extrasItems = [{ name: game.extras, amount: extrasAmt }]
          }

          for (const item of extrasItems) {
            if ((item.amount || 0) > 0) {
              await sql`
                INSERT INTO "Transaction" (
                  id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt"
                ) VALUES (
                  ${globalThis.crypto.randomUUID()},
                  'income',
                  ${item.amount},
                  'extras',
                  ${"Допродажа: " + (item.name || "Доп. услуги") + " — " + game.clientName},
                  ${game.franchiseeId},
                  ${id},
                  ${gameDate},
                  NOW()
                )
              `
            }
          }
        }

        if (totalStaffCost > 0) {
          await sql`
            INSERT INTO "Transaction" (
              id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt"
            ) VALUES (
              ${globalThis.crypto.randomUUID()},
              'expense',
              ${totalStaffCost},
              'fot',
              ${"ФОТ за игру: " + game.clientName + " (Аним: " + (game.animatorsCount || 0) + ", Вед: " + (game.hostsCount || 0) + ", DJ: " + (game.djsCount || 0) + (Number(game.extraStaffCount) > 0 ? ", Доп: " + game.extraStaffCount : "") + ")"},
              ${game.franchiseeId},
              ${id},
              ${gameDate},
              NOW()
            )
          `
        }

        await sql`
          INSERT INTO "GameLeadLog" (id, "leadId", action, details, "pipelineId", "userId", "userName", "franchiseeId", "clientName")
          VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'completed', ${"Игра завершена. Выручка: " + totalAmount + " ₽, ФОТ: " + totalStaffCost + " ₽"}, ${game.pipelineId}, ${user?.userId || null}, ${user?.name || null}, ${game.franchiseeId || null}, ${game.clientName || null})
        `
      }

      if (stageType !== "completed") {
        const [oldStage] = await sql`SELECT "stageType" FROM "GamePipelineStage" WHERE id = ${currentGame.stageId}`
        if (oldStage?.stageType === "completed") {
          await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category != 'prepayment'`
        }
      }
    }

    // Recalculate transactions if game is already completed and financial fields changed
    const financialFieldsChanged = body.playersCount !== undefined || body.pricePerPerson !== undefined ||
      body.prepayment !== undefined || body.animatorsCount !== undefined || body.animatorRate !== undefined ||
      body.hostsCount !== undefined || body.hostRate !== undefined || body.djsCount !== undefined || body.djRate !== undefined ||
      body.extraStaffCount !== undefined || body.extraStaffRate !== undefined ||
      body.extras !== undefined || body.extrasAmount !== undefined

    if (financialFieldsChanged && !body.stageId) {
      const [game] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`
      const [stage] = await sql`SELECT "stageType" FROM "GamePipelineStage" WHERE id = ${game.stageId}`

      if (stage?.stageType === "completed") {
        const totalAmount = Number.parseFloat(game.totalAmount) || 0
        const prepayment = Number.parseFloat(game.prepayment) || 0
        const postpayment = totalAmount - prepayment

        // Update postpayment transaction
        const existingPost = await sql`SELECT id FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'postpayment'`
        if (existingPost.length > 0) {
          if (postpayment > 0) {
            await sql`
              UPDATE "Transaction"
              SET amount = ${postpayment},
                  description = ${"Постоплата за игру: " + game.clientName + " (" + game.playersCount + " чел.)"}
              WHERE "gameLeadId" = ${id} AND category = 'postpayment'
            `
          } else {
            await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'postpayment'`
          }
        } else if (postpayment > 0) {
          await sql`
            INSERT INTO "Transaction" (id, type, amount, category, description, "franchiseeId", "gameLeadId", "paymentMethod", date, "createdAt")
            VALUES (${globalThis.crypto.randomUUID()}, 'income', ${postpayment}, 'postpayment',
              ${"Постоплата за игру: " + game.clientName + " (" + game.playersCount + " чел.)"},
              ${game.franchiseeId}, ${id}, ${game.paymentMethod || "cash"},
              ${game.gameDate || new Date().toISOString().split("T")[0]}, NOW())
          `
        }

        // Update or create prepayment transaction
        const existingPre = await sql`SELECT id FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'prepayment'`
        if (existingPre.length > 0) {
          if (prepayment > 0) {
            await sql`
              UPDATE "Transaction"
              SET amount = ${prepayment},
                  description = ${"Предоплата за игру: " + game.clientName}
              WHERE "gameLeadId" = ${id} AND category = 'prepayment'
            `
          } else {
            await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'prepayment'`
          }
        } else if (prepayment > 0) {
          await sql`
            INSERT INTO "Transaction" (id, type, amount, category, description, "franchiseeId", "gameLeadId", "paymentMethod", date, "createdAt")
            VALUES (${globalThis.crypto.randomUUID()}, 'income', ${prepayment}, 'prepayment',
              ${"Предоплата за игру: " + game.clientName},
              ${game.franchiseeId}, ${id}, ${game.paymentMethod || "cash"},
              ${game.gameDate || new Date().toISOString().split("T")[0]}, NOW())
          `
        }

        // Update FOT transaction
        const animatorsCost = (Number.parseInt(game.animatorsCount) || 0) * (Number.parseFloat(game.animatorRate) || 0)
        const hostsCost = (Number.parseInt(game.hostsCount) || 0) * (Number.parseFloat(game.hostRate) || 0)
        const djsCost = (Number.parseInt(game.djsCount) || 0) * (Number.parseFloat(game.djRate) || 0)
        const extraStaffCost = (Number.parseInt(game.extraStaffCount) || 0) * (Number.parseFloat(game.extraStaffRate) || 0)
        const totalStaffCost = animatorsCost + hostsCost + djsCost + extraStaffCost

        const existingFot = await sql`SELECT id FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'fot'`
        if (existingFot.length > 0) {
          if (totalStaffCost > 0) {
            await sql`
              UPDATE "Transaction"
              SET amount = ${totalStaffCost},
                  description = ${"ФОТ за игру: " + game.clientName + " (Аним: " + (game.animatorsCount || 0) + ", Вед: " + (game.hostsCount || 0) + ", DJ: " + (game.djsCount || 0) + (Number(game.extraStaffCount) > 0 ? ", Доп: " + game.extraStaffCount : "") + ")"}
              WHERE "gameLeadId" = ${id} AND category = 'fot'
            `
          } else {
            await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'fot'`
          }
        } else if (totalStaffCost > 0) {
          await sql`
            INSERT INTO "Transaction" (id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt")
            VALUES (${globalThis.crypto.randomUUID()}, 'expense', ${totalStaffCost}, 'fot',
              ${"ФОТ за игру: " + game.clientName + " (Аним: " + (game.animatorsCount || 0) + ", Вед: " + (game.hostsCount || 0) + ", DJ: " + (game.djsCount || 0) + (Number(game.extraStaffCount) > 0 ? ", Доп: " + game.extraStaffCount : "") + ")"},
              ${game.franchiseeId}, ${id}, ${game.gameDate || new Date().toISOString().split("T")[0]}, NOW())
          `
        }
      }
    }

    const [finalGame] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`
    return NextResponse.json({ success: true, data: finalGame })
  } catch (error: any) {
    console.error("[v0] Error updating game:", error)
    return NextResponse.json({ success: false, error: "Failed to update game" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ukRoles = ["uk", "super_admin", "uk_employee"]

    // Admin cannot delete leads — only franchisee owner and UK
    if (user.role === "admin") {
      return NextResponse.json({ error: "Администратор не может удалять заявки" }, { status: 403 })
    }

    const [game] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (!ukRoles.includes(user.role) && game.franchiseeId !== user.franchiseeId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Delete related data first (before the lead itself)
    await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id}`
    await sql`DELETE FROM "GameScheduleStaff" WHERE "scheduleId" IN (SELECT id FROM "GameSchedule" WHERE "leadId" = ${id})`
    await sql`DELETE FROM "GameSchedule" WHERE "leadId" = ${id}`
    await sql`DELETE FROM "GameLeadTask" WHERE "leadId" = ${id}`
    await sql`DELETE FROM "GameLeadEvent" WHERE "leadId" = ${id}`
    // Delete existing logs for this lead (they'll be cascade-orphaned anyway)
    await sql`DELETE FROM "GameLeadLog" WHERE "leadId" = ${id}`
    // Delete the lead itself
    await sql`DELETE FROM "GameLead" WHERE id = ${id}`

    // Log deletion AFTER deleting the lead, with leadId = null so the log survives
    const logId = globalThis.crypto.randomUUID()
    await sql`
      INSERT INTO "GameLeadLog" (id, "leadId", action, details, "pipelineId", "userId", "userName", "franchiseeId", "clientName")
      VALUES (${logId}, null, 'delete', ${"Удаление заявки: " + game.clientName}, ${game.pipelineId}, ${user?.userId || null}, ${user?.name || null}, ${game.franchiseeId || null}, ${game.clientName || null})
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting game:")
    const errorMessage = error?.message || String(error)
    return NextResponse.json({ success: false, error: "Failed to delete game", }, { status: 500 })
  }
}
