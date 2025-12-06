// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// Это обязательно должно быть именно так в App Router
export { handler as GET, handler as POST };
