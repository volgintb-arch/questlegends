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
          console.log("[v0] NextAuth authorize started")

          if (!credentials?.phone || !credentials?.password) {
            console.log("[v0] Missing credentials")
            return null
          }

          console.log("[v0] Searching user with phone:", credentials.phone)

          let user
          try {
            user = await prisma.user.findUnique({
              where: { phone: credentials.phone },
            })
          } catch (dbError) {
            console.error("[v0] Database error finding user:", dbError)
            return null
          }

          console.log("[v0] User lookup result:", user ? `Found user ${user.id}` : "User not found")

          if (!user) {
            console.log("[v0] User not found")
            return null
          }

          if (!user.isActive) {
            console.log("[v0] User is not active")
            return null
          }

          console.log("[v0] Comparing password")

          let isPasswordValid = false
          try {
            isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)
          } catch (bcryptError) {
            console.error("[v0] Bcrypt error:", bcryptError)
            return null
          }

          if (!isPasswordValid) {
            console.log("[v0] Invalid password")
            return null
          }

          console.log("[v0] Authentication successful, returning user data")

          return {
            id: user.id,
            name: user.name,
            email: user.phone,
            phone: user.phone,
            role: user.role,
            franchiseeId: user.franchiseeId || null,
          }
        } catch (error) {
          console.error("[v0] Unexpected error in authorize:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
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
        console.error("[v0] Error in jwt callback:", error)
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
        console.error("[v0] Error in session callback:", error)
        return session
      }
    },
  },
  debug: true, // Force debug mode to get more logs
  secret: process.env.NEXTAUTH_SECRET, // Explicitly set secret
}
