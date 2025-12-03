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
        if (!credentials?.phone || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
          include: { franchisee: true, permissions: true },
        })

        if (!user || !user.isActive) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isPasswordValid) {
          return null
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

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          franchiseeId: user.franchiseeId,
          franchiseeName: user.franchisee?.name,
          permissions: user.permissions,
          refreshToken: refreshToken.token,
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
