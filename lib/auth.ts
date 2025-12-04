import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

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

          const user = await prisma.user.findUnique({
            where: { phone: credentials.phone },
          })

          if (!user || !user.isActive || !user.passwordHash) {
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
          console.error("[v0] NextAuth authorize error:", error)
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
      try {
        if (user) {
          token.id = user.id
          token.role = user.role
          token.phone = user.phone
          token.franchiseeId = user.franchiseeId
        }
        return token
      } catch (error) {
        console.error("[v0] JWT callback error:", error)
        return token
      }
    },
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id as string
          session.user.role = token.role as string
          session.user.phone = token.phone as string
          session.user.franchiseeId = token.franchiseeId as string | null
        }
        return session
      } catch (error) {
        console.error("[v0] Session callback error:", error)
        return session
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
}
