declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      phone: string
      role: string
      franchiseeId?: string
      franchiseeName?: string
    }
  }

  interface User {
    id: string
    name: string
    phone: string
    role: string
    franchiseeId?: string
    franchiseeName?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    franchiseeId?: string
    franchiseeName?: string
  }
}
