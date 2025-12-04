import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Телефон", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        console.log("[v0] NextAuth authorize called with phone:", credentials?.phone)

        if (!credentials?.phone || !credentials?.password) {
          console.log("[v0] Missing credentials")
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { phone: credentials.phone },
          })

          console.log("[v0] User found:", user ? user.id : "null")

          if (!user || !user.isActive) {
            console.log("[v0] User not found or inactive")
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)

          if (!isPasswordValid) {
            console.log("[v0] Invalid password")
            return null
          }

          console.log("[v0] Password valid, creating refresh token")

          let franchiseeName = null
          if (user.franchiseeId) {
            try {
              const franchisee = await prisma.franchisee.findUnique({
                where: { id: user.franchiseeId },
                select: { name: true },
              })
              franchiseeName = franchisee?.name || null
            } catch (error) {
              console.log("[v0] Error loading franchisee:", error)
            }
          }

          let permissions = null
          try {
            const userPermissions = await prisma.userPermission.findUnique({
              where: { userId: user.id },
            })
            permissions = userPermissions
          } catch (error) {
            console.log("[v0] Error loading permissions:", error)
          }

          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7)

          const refreshToken = await prisma.refreshToken.create({
            data: {
              token: crypto.randomUUID(),
              userId: user.id,
              expiresAt,
            },
          })

          console.log("[v0] Auth successful for user:", user.id)

          return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            franchiseeId: user.franchiseeId,
            franchiseeName,
            permissions,
            refreshToken: refreshToken.token,
          }
        } catch (error) {
          console.error("[v0] Error in authorize:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes for access token
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.franchiseeId = user.franchiseeId
        token.franchiseeName = user.franchiseeName
        token.permissions = user.permissions
        token.refreshToken = user.refreshToken
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.franchiseeId = token.franchiseeId as string
        session.user.franchiseeName = token.franchiseeName as string
        session.user.permissions = token.permissions
        session.user.refreshToken = token.refreshToken as string
      }
      return session
    },
  },
}
