import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Hash default password
  const defaultPassword = await bcrypt.hash("123456", 10)

  // 1. Create UK user
  const uk = await prisma.user.create({
    data: {
      phone: "+79991111111",
      passwordHash: defaultPassword,
      name: "Иван Петров",
      role: "uk",
      telegram: "@ivan_uk",
      description: "Директор УК",
    },
  })

  console.log("✅ Created UK user")

  // 2. Create 4 franchisees with 12 locations total
  const franchisees = []
  const cities = ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург"]

  for (let i = 0; i < 4; i++) {
    const franchisee = await prisma.franchisee.create({
      data: {
        name: `Франшиза ${cities[i]}`,
        city: cities[i],
        address: `ул. Ленина, ${i + 10}`,
        kpi: {
          create: {
            targetRevenue: 1000000 + i * 200000,
            targetGames: 50 + i * 10,
            maxExpenses: 500000 + i * 100000,
          },
        },
        telegramTemplates: {
          create: [
            {
              type: "TWO_DAYS_BEFORE",
              message: "Привет! Напоминаем, что через 2 дня вас ждёт квест. До встречи!",
              isActive: true,
            },
            {
              type: "AFTER_GAME",
              message: "Спасибо за игру! Будем рады видеть вас снова!",
              isActive: true,
            },
          ],
        },
      },
    })

    franchisees.push(franchisee)

    // Create franchisee user
    await prisma.user.create({
      data: {
        phone: `+7999222${i}${i}${i}${i}`,
        passwordHash: defaultPassword,
        name: `Владелец ${cities[i]}`,
        role: "franchisee",
        franchiseeId: franchisee.id,
        telegram: `@owner_${i}`,
      },
    })
  }

  console.log("✅ Created 4 franchisees")

  // 3. Create admins and personnel for each franchisee
  for (const franchisee of franchisees) {
    // 3 admins per franchisee
    for (let j = 0; j < 3; j++) {
      const admin = await prisma.user.create({
        data: {
          phone: `+7999${franchisee.id.slice(0, 3)}${j}${j}${j}`,
          passwordHash: defaultPassword,
          name: `Администратор ${j + 1}`,
          role: "admin",
          franchiseeId: franchisee.id,
          permissions: {
            create: {
              canCRM: true,
              canExpenses: j === 0,
              canSchedule: true,
              canKnowledge: true,
              canUsers: j === 0,
            },
          },
        },
      })
    }

    // 15 personnel per franchisee
    const roles = ["animator", "host", "dj"] as const
    for (let k = 0; k < 15; k++) {
      const personnelUser = await prisma.user.create({
        data: {
          phone: `+7999${franchisee.id.slice(4, 7)}${k}${k}`,
          passwordHash: defaultPassword,
          name: `Сотрудник ${k + 1}`,
          role: "employee",
          franchiseeId: franchisee.id,
          telegram: `@employee_${k}`,
        },
      })

      await prisma.personnel.create({
        data: {
          franchiseeId: franchisee.id,
          name: `Сотрудник ${k + 1}`,
          role: roles[k % 3],
          phone: `+7999${franchisee.id.slice(4, 7)}${k}${k}`,
          telegram: `@employee_${k}`,
          userId: personnelUser.id,
        },
      })
    }
  }

  console.log("✅ Created personnel for all franchisees")

  // 4. Create 80 deals across all franchisees
  const stages = ["NEW", "NEGOTIATION", "PREPAID", "SCHEDULED", "COMPLETED", "CANCELLED"] as const
  const sources = ["Instagram", "WhatsApp", "Telegram", "VK", "Сайт"]

  for (const franchisee of franchisees) {
    for (let i = 0; i < 20; i++) {
      const gameDate = new Date()
      gameDate.setDate(gameDate.getDate() + Math.floor(Math.random() * 30))

      const participants = 8 + Math.floor(Math.random() * 12)
      const checkPerPerson = 5000 + Math.floor(Math.random() * 3000)
      const animatorsCount = Math.floor(participants / 5)
      const stage = stages[Math.floor(Math.random() * stages.length)]

      const deal = await prisma.deal.create({
        data: {
          title: `Игра ${i + 1}`,
          stage: stage,
          source: sources[Math.floor(Math.random() * sources.length)],
          priority: ["LOW", "MEDIUM", "HIGH"][Math.floor(Math.random() * 3)] as any,
          clientName: `Клиент ${i + 1}`,
          clientPhone: `+7999${Math.random().toString().slice(2, 9)}`,
          clientTelegram: `@client_${i}`,
          participants,
          checkPerPerson,
          gameDate,
          animatorsCount,
          animatorRate: 3000,
          hostRate: 5000,
          djRate: 4000,
          franchiseeId: franchisee.id,
        },
      })

      // Create transaction for completed deals
      if (stage === "COMPLETED") {
        const revenue = participants * checkPerPerson
        const fot = animatorsCount * 3000 + 5000 + 4000
        const royalty = Math.floor(revenue * 0.07)

        await prisma.transaction.create({
          data: {
            dealId: deal.id,
            franchiseeId: franchisee.id,
            date: gameDate,
            participants,
            checkPerPerson,
            revenue,
            fot,
            royalty,
          },
        })
      }
    }
  }

  console.log("✅ Created 80 deals with transactions")

  // 5. Create some expenses
  for (const franchisee of franchisees) {
    const franchiseeUser = await prisma.user.findFirst({
      where: { franchiseeId: franchisee.id, role: "franchisee" },
    })

    if (franchiseeUser) {
      const categories = ["Аренда", "Коммунальные услуги", "Маркетинг", "Оборудование"]
      for (let i = 0; i < 5; i++) {
        await prisma.expense.create({
          data: {
            franchiseeId: franchisee.id,
            category: categories[i % categories.length],
            amount: 50000 + Math.floor(Math.random() * 100000),
            description: `Расход ${i + 1}`,
            date: new Date(),
            createdById: franchiseeUser.id,
          },
        })
      }
    }
  }

  console.log("✅ Created expenses")
  console.log("🎉 Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
