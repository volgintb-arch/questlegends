import { z } from "zod"

export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")

export const dealSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientPhone: z.string().optional(),
  clientTelegram: z.string().optional(),
  clientWhatsapp: z.string().optional(),
  gameType: z.string().optional(),
  location: z.string().optional(),
  gameDate: z.string().optional(),
  participants: z.number().optional(),
  packageType: z.string().optional(),
  price: z.number().optional(),
  stage: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "GAME_COMPLETED", "WON", "LOST"])
    .optional()
    .default("NEW"),
  discount: z.number().min(0).max(100).optional(),
  source: z.string().optional(),
  description: z.string().optional(),
})

export const transactionSchema = z.object({
  dealId: z.string().cuid().optional(),
  gameType: z.string().min(1),
  location: z.string().min(1),
  dateTime: z.string().datetime(),
  participants: z.number().min(1),
  price: z.number().min(0),
  revenue: z.number().min(0),
  discount: z.number().min(0).max(100).optional(),
})

export const expenseSchema = z.object({
  category: z.enum(["RENT", "UTILITIES", "MARKETING", "SALARIES", "EQUIPMENT", "OTHER"]),
  amount: z.number().min(0),
  description: z.string().min(1),
  date: z.string().datetime(),
})

export const personnelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: phoneSchema,
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  role: z.enum(["ANIMATOR", "HOST", "DJ"]),
  hourlyRate: z.number().min(0),
  description: z.string().optional(),
})

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: phoneSchema,
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  role: z.enum(["FRANCHISEE", "ADMIN", "ANIMATOR", "HOST", "DJ"]),
  description: z.string().optional(),
})
