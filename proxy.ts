import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/login", "/api/auth/login", "/api/auth/logout"]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Authentication is handled by AuthContext on client and API route protection on server
  const response = NextResponse.next()

  // Security Headers
  response.headers.set("X-DNS-Prefetch-Control", "on")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()")

  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://vercel.live https://*.vercel-insights.com https://*.vercel.app wss://*.pusher.com https://api.telegram.org https://*.neon.tech",
    "frame-src 'self' https://vercel.live",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ]

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "))

  if (pathname.startsWith("/api")) {
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)"],
}
