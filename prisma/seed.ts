import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const defaultPassword = await bcrypt.hash("123456", 10)
  const adminPassword = await bcrypt.hash("admin123", 10)

  // 1. Create UK (head office) user
  const uk = await prisma.user.create({
    data: {
      phone: "+79000000000",
      passwordHash: adminPassword,
      name: "Главный Администратор",
      role: "uk",
      telegram: "@admin_uk",
      description: "Директор УК",
    },
  })

  // Create AdminPermission for UK user
  await prisma.adminPermission.create({
    data: {
      userId: uk.id,
      canManagePersonnel: true,
      canManageDeals: true,
      canViewFinances: true,
      canManageSchedule: true,
    },
  })

  console.log("Created UK user: +79000000000 / admin123")

  // 2. Create 4 franchisees
  const franchisees = []
  const cities = ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург"]

  for (let i = 0; i < 4; i++) {
    const franchisee = await prisma.franchisee.create({
      data: {
        name: `Франшиза ${cities[i]}`,
        city: cities[i],
        address: `ул. Ленина, ${i + 10}`,
        royaltyPercent: 10,
      },
    })

    franchisees.push(franchisee)

    // Create KPI for current month
    const now = new Date()
    await prisma.franchiseeKPI.create({
      data: {
        franchiseeId: franchisee.id,
        periodType: "month",
        periodNumber: now.getMonth() + 1,
        periodYear: now.getFullYear(),
        targetRevenue: 1000000 + i * 200000,
        targetGames: 50 + i * 10,
        maxExpenses: 500000 + i * 100000,
      },
    })

    // Create franchisee owner user
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

  console.log("Created 4 franchisees with owners")

  // 3. Create admins and personnel for each franchisee
  for (let fi = 0; fi < franchisees.length; fi++) {
    const franchisee = franchisees[fi]
    // 2 admins per franchisee
    for (let j = 0; j < 2; j++) {
      const admin = await prisma.user.create({
        data: {
          phone: `+78880${fi}${j}0${fi}${j}00`,
          passwordHash: defaultPassword,
          name: `Администратор ${j + 1} (${franchisee.city})`,
          role: "admin",
          franchiseeId: franchisee.id,
        },
      })

      await prisma.adminPermission.create({
        data: {
          userId: admin.id,
          canManagePersonnel: true,
          canManageDeals: true,
          canViewFinances: j === 0,
          canManageSchedule: true,
        },
      })
    }

    // 6 personnel per franchisee
    const personnelRoles = ["animator", "host", "dj"] as const
    for (let k = 0; k < 6; k++) {
      const empUser = await prisma.user.create({
        data: {
          phone: `+77770${fi}${k}0${fi}${k}00`,
          passwordHash: defaultPassword,
          name: `Сотрудник ${k + 1} (${franchisee.city})`,
          role: "employee",
          franchiseeId: franchisee.id,
          telegram: `@emp_${fi}_${k}`,
        },
      })

      await prisma.personnel.create({
        data: {
          franchiseeId: franchisee.id,
          name: empUser.name,
          role: personnelRoles[k % 3],
          phone: empUser.phone,
          telegram: empUser.telegram,
          userId: empUser.id,
        },
      })
    }
  }

  console.log("Created admins and personnel")

  // 4. Create deals across all franchisees
  const stages = ["NEW", "NEGOTIATION", "PREPAID", "SCHEDULED", "COMPLETED", "CANCELLED"] as const
  const sources = ["Instagram", "WhatsApp", "Telegram", "VK", "Сайт"]

  for (const franchisee of franchisees) {
    for (let i = 0; i < 15; i++) {
      const gameDate = new Date()
      gameDate.setDate(gameDate.getDate() + Math.floor(Math.random() * 30) - 10)

      const participants = 8 + Math.floor(Math.random() * 12)
      const checkPerPerson = 5000 + Math.floor(Math.random() * 3000)
      const animatorsCount = Math.floor(participants / 5)
      const stage = stages[Math.floor(Math.random() * stages.length)]

      const deal = await prisma.deal.create({
        data: {
          title: `Игра ${i + 1}`,
          stage,
          source: sources[Math.floor(Math.random() * sources.length)],
          priority: (["LOW", "MEDIUM", "HIGH"] as const)[Math.floor(Math.random() * 3)],
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
        const royalty = Math.floor(revenue * (franchisee.royaltyPercent / 100))

        await prisma.transaction.create({
          data: {
            dealId: deal.id,
            franchiseeId: franchisee.id,
            amount: revenue,
            paymentMethod: ["cash", "card", "transfer"][Math.floor(Math.random() * 3)],
            paymentDate: gameDate,
            royaltyAmount: royalty,
          },
        })
      }
    }
  }

  console.log("Created 60 deals with transactions")

  // 5. Create expenses
  const categories = ["Аренда", "Коммунальные услуги", "Маркетинг", "Оборудование", "Зарплата"]

  for (const franchisee of franchisees) {
    const owner = await prisma.user.findFirst({
      where: { franchiseeId: franchisee.id, role: "franchisee" },
    })

    if (owner) {
      for (let i = 0; i < 5; i++) {
        await prisma.expense.create({
          data: {
            franchiseeId: franchisee.id,
            category: categories[i % categories.length],
            amount: 50000 + Math.floor(Math.random() * 100000),
            description: `Расход: ${categories[i % categories.length]}`,
            createdById: owner.id,
          },
        })
      }
    }
  }

  console.log("Created expenses")
  console.log("")
  console.log("=== SEED COMPLETE ===")
  console.log("Login: +79000000000 / admin123 (UK admin)")
  console.log("Franchisee owners: +79992220000..3333 / 123456")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
