import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const protectedRoutes = [
  "/",
  "/crm",
  "/erp",
  "/finances",
  "/personnel",
  "/shifts",
  "/users",
  "/access",
  "/knowledge",
  "/messages",
  "/notifications",
  "/marketing",
  "/incidents",
]

const roleBasedRoutes: Record<string, string[]> = {
  "/users": ["super_admin", "admin", "uk_company"],
  "/access": ["super_admin", "franchisee", "uk_company"],
  "/erp": ["super_admin", "uk_company"],
  "/finances": ["super_admin", "franchisee", "uk_company"],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  const isProtectedRoute = protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))

  if (isProtectedRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        if (!allowedRoles.includes(token.role as string)) {
          return NextResponse.redirect(new URL("/", request.url))
        }
      }
    }
  }

  const response = NextResponse.next()

  // Prevent DNS prefetching on untrusted links
  response.headers.set("X-DNS-Prefetch-Control", "on")

  // Force HTTPS for 1 year including subdomains
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

  // Prevent clickjacking attacks
  response.headers.set("X-Frame-Options", "SAMEORIGIN")

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  // Enable XSS protection in older browsers
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Disable potentially dangerous browser features
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
