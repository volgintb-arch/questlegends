import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@/lib/neon-compat"
import { verifyRequest } from "@/lib/simple-auth"
import { canAccessFranchisee } from "@/lib/tenant"
import { AccessControl, type SystemRole } from "@/lib/access-control"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [game] = await sql`
      SELECT g.*, u.name as "responsibleName"
      FROM "GameLead" g
      LEFT JOIN "User" u ON g."responsibleId" = u.id
      WHERE g.id = ${id}
    `

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (!canAccessFranchisee(user, game.franchiseeId)) {
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

    // Tenant isolation: only UK roles or the owning franchisee may modify a lead.
    // This check existed in GET and DELETE but was missing here — and PATCH is
    // the method that creates/deletes financial transactions on stage change.
    if (!canAccessFranchisee(user, currentGame.franchiseeId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get old stage name and type
    let oldStageName = ""
    let oldStageType = ""
    if (currentGame.stageId) {
      const [oldStage] = await sql`SELECT name, "stageType" FROM "GamePipelineStage" WHERE id = ${currentGame.stageId}`
      oldStageName = oldStage?.name || ""
      oldStageType = oldStage?.stageType || ""
    }

    // Validate the target stage BEFORE any UPDATE below: the field loop writes
    // stageId, so a late check would reject the request after the lead had
    // already moved to a foreign stage (and vanished from its board).
    const stageChanging = !!body.stageId && body.stageId !== currentGame.stageId
    let newStage: { name: string | null; stageType: string | null; pipelineId: string } | null = null
    if (stageChanging) {
      const [st] = await sql`SELECT name, "stageType", "pipelineId" FROM "GamePipelineStage" WHERE id = ${body.stageId}`
      if (!st || st.pipelineId !== currentGame.pipelineId) {
        return NextResponse.json({ error: "Этап не принадлежит воронке этой заявки" }, { status: 400 })
      }
      newStage = { name: st.name, stageType: st.stageType, pipelineId: st.pipelineId }
    }

    // Money on a completed game is bookkeeping: the recalculation further down
    // rewrites the postpayment posting, so it needs the "edit leads" permission
    // (employees may move cards but not change the books).
    const moneyFieldsTouched = ["playersCount", "pricePerPerson", "totalAmount", "prepayment"].some(
      (f) => body[f] !== undefined,
    )
    if (moneyFieldsTouched && oldStageType === "completed") {
      const access = new AccessControl({
        id: user.userId,
        role: user.role as SystemRole,
        franchiseeId: user.franchiseeId,
      })
      if (!access.canPerformAction("leads", "edit")) {
        return NextResponse.json({ error: "Недостаточно прав для изменения сумм завершённой игры" }, { status: 403 })
      }
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
      "extras",
      "extrasAmount",
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
          // Keep the system postings of this game (prepayment; for a completed game
          // also postpayment, extras and fot) in the same period as the game. Manual
          // transactions linked to the lead keep the date the user chose.
          if (value) {
            await sql`
              UPDATE "Transaction" SET date = ${value}
              WHERE "gameLeadId" = ${id} AND category IN ('prepayment', 'postpayment', 'extras', 'fot')
            `
          }

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

          // TokenPayload has userId, not id — the old comparison was always true,
          // so a self-assignment notified the assigner about themselves.
          if (value && value !== oldResponsibleId && value !== user?.userId) {
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
        } else if (field === "extras") {
          await sql`UPDATE "GameLead" SET "extras" = ${value || null}, "updatedAt" = NOW() WHERE id = ${id}`
        } else if (field === "extrasAmount") {
          await sql`UPDATE "GameLead" SET "extrasAmount" = ${value || 0}, "updatedAt" = NOW() WHERE id = ${id}`
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
            ${globalThis.crypto.randomUUID()},
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
          INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
          VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'system', ${"Предоплата изменена: " + oldPrepayment + " → " + newPrepayment + " ₽"}, ${user?.userId || null}, ${user?.name || null})
        `
      }
    }

    // Edits to a lead that is already completed must be reflected in the books:
    // previously only a stage change recalculated postings, so changing players,
    // price or prepayment after completion left the postpayment row stale.
    if (moneyFieldsTouched && !stageChanging && oldStageType === "completed") {
      const [g] = await sql`SELECT "totalAmount", prepayment, "clientName", "playersCount", "franchiseeId", "gameDate" FROM "GameLead" WHERE id = ${id}`
      const total = Number.parseFloat(g.totalAmount) || 0
      const prepaid = Number.parseFloat(g.prepayment) || 0
      const postpayment = total - prepaid
      const existingPost = await sql`SELECT id, amount FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'postpayment'`
      const bookedPost = existingPost.length > 0 ? Number.parseFloat(existingPost[0].amount) || 0 : 0
      // The card saves on blur, so most requests carry unchanged numbers — touch
      // the books (and the feed) only when the postpayment actually differs.
      if (Math.abs(Math.max(postpayment, 0) - bookedPost) > 0.01) {
        if (postpayment > 0) {
          if (existingPost.length > 0) {
            await sql`
              UPDATE "Transaction"
              SET amount = ${postpayment}, description = ${"Постоплата за игру: " + g.clientName + " (" + g.playersCount + " чел.)"}
              WHERE "gameLeadId" = ${id} AND category = 'postpayment'
            `
          } else {
            await sql`
              INSERT INTO "Transaction" (id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt")
              VALUES (${globalThis.crypto.randomUUID()}, 'income', ${postpayment}, 'postpayment',
                      ${"Постоплата за игру: " + g.clientName + " (" + g.playersCount + " чел.)"},
                      ${g.franchiseeId}, ${id}, ${g.gameDate || new Date().toISOString().split("T")[0]}, NOW())
            `
          }
        } else if (existingPost.length > 0) {
          await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'postpayment'`
        }
        await sql`
          INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
          VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'system', ${"Проводки пересчитаны после правки завершённой игры: постоплата " + bookedPost + " → " + Math.max(postpayment, 0) + " ₽"}, ${user?.userId || null}, ${user?.name || null})
        `
      }
    }

    if (stageChanging && newStage) {
      const newStageName = newStage.name || ""
      const stageType = newStage.stageType || ""

      // Actual staff cost is read HERE, before the unschedule block below deletes
      // the assignments: "scheduled → completed" is the main path and must see
      // them. A row with rate 0 means "rate unknown", not "free" — per row, fall
      // back to the lead's planned rate for that role.
      let actualStaffCost = 0
      let assignedCount = 0
      if (stageType === "completed") {
        try {
          const [agg] = await sql`
            SELECT COALESCE(SUM(CASE
                     WHEN COALESCE(gss.rate, 0) > 0 THEN gss.rate
                     WHEN gss.role = 'animator' THEN COALESCE(gl."animatorRate", 0)
                     WHEN gss.role = 'host' THEN COALESCE(gl."hostRate", 0)
                     WHEN gss.role = 'dj' THEN COALESCE(gl."djRate", 0)
                     ELSE 0 END), 0)::int as total,
                   COUNT(*)::int as cnt
            FROM "GameScheduleStaff" gss
            JOIN "GameSchedule" gs ON gs.id = gss."scheduleId"
            JOIN "GameLead" gl ON gl.id = gs."leadId"
            WHERE gs."leadId" = ${id}
          `
          actualStaffCost = Number(agg?.total) || 0
          assignedCount = Number(agg?.cnt) || 0
        } catch (e) {
          console.error("[game-leads] staff cost lookup failed, using plan:", e)
        }
      }

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

        // Staff cost: actual assignments (read above, before unschedule) win over the plan.
        const plannedStaffCost =
          (Number.parseInt(game.animatorsCount) || 0) * (Number.parseFloat(game.animatorRate) || 0) +
          (Number.parseInt(game.hostsCount) || 0) * (Number.parseFloat(game.hostRate) || 0) +
          (Number.parseInt(game.djsCount) || 0) * (Number.parseFloat(game.djRate) || 0)
        const staffCostSource = assignedCount > 0 && actualStaffCost > 0 ? "actual" : "plan"
        const totalStaffCost = staffCostSource === "actual" ? actualStaffCost : plannedStaffCost

        const gameDate = game.gameDate || new Date().toISOString().split("T")[0]

        if (postpayment > 0) {
          await sql`
            INSERT INTO "Transaction" (
              id, type, amount, category, description, "franchiseeId", "gameLeadId", date, "createdAt"
            ) VALUES (
              ${globalThis.crypto.randomUUID()},
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
              ${"ФОТ за игру: " + game.clientName + " (Аним: " + (game.animatorsCount || 0) + ", Вед: " + (game.hostsCount || 0) + ", DJ: " + (game.djsCount || 0) + ")"},
              ${game.franchiseeId},
              ${id},
              ${gameDate},
              NOW()
            )
          `
        }

        await sql`
          INSERT INTO "GameLeadLog" (id, "leadId", action, details, "pipelineId", "userId", "userName", "franchiseeId", "clientName")
          VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'completed', ${"Игра завершена. Выручка: " + totalAmount + " ₽, ФОТ: " + totalStaffCost + " ₽" + (staffCostSource === "actual" ? " (по назначенному персоналу: " + assignedCount + " чел.)" : " (по плану — персонал не назначен)")}, ${game.pipelineId}, ${user?.userId || null}, ${user?.name || null}, ${game.franchiseeId || null}, ${game.clientName || null})
        `
      }

      if (stageType !== "completed") {
        const [oldStage] = await sql`SELECT "stageType" FROM "GamePipelineStage" WHERE id = ${currentGame.stageId}`
        if (oldStage?.stageType === "completed") {
          await sql`DELETE FROM "Transaction" WHERE "gameLeadId" = ${id} AND category != 'prepayment'`
          // The prepayment row is intentionally kept: the money was received. If it is
          // being refunded, that is a separate manual transaction — say so in the feed.
          const [pp] = await sql`SELECT amount FROM "Transaction" WHERE "gameLeadId" = ${id} AND category = 'prepayment' LIMIT 1`
          await sql`
            INSERT INTO "GameLeadEvent" (id, "leadId", type, content, "userId", "userName")
            VALUES (${globalThis.crypto.randomUUID()}, ${id}, 'system',
              ${"Игра выведена из «Завершено»: постоплата, допродажи и ФОТ удалены из книг." + (pp ? " Предоплата " + pp.amount + " ₽ осталась в книгах — при возврате оформите расход вручную." : "")},
              ${user?.userId || null}, ${user?.name || null})
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

    const [game] = await sql`SELECT * FROM "GameLead" WHERE id = ${id}`
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (!canAccessFranchisee(user, game.franchiseeId)) {
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
