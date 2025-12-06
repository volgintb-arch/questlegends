import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Телефон", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.phone || !credentials?.password) {
            return null
          }

          const sql = neon(process.env.DATABASE_URL!)

          const users = await sql`
            SELECT id, name, phone, role, "passwordHash", "isActive", "franchiseeId"
            FROM "User"
            WHERE phone = ${credentials.phone}
            LIMIT 1
          `

          if (users.length === 0) {
            return null
          }

          const user = users[0]

          if (!user.isActive || !user.passwordHash) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: user.phone,
            phone: user.phone,
            role: user.role,
            franchiseeId: user.franchiseeId || null,
          }
        } catch (error) {
          console.error("[v0] Auth error:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.phone = user.phone
        token.franchiseeId = user.franchiseeId
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.phone = token.phone as string
        session.user.franchiseeId = token.franchiseeId as string | null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
