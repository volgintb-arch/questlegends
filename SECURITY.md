# Security Policy

## Implemented Security Measures

### 1. Authentication & Authorization
- NextAuth-based authentication with JWT tokens
- Role-based access control (RBAC) for all routes and API endpoints
- Session management with secure HTTP-only cookies
- Password hashing with bcrypt (10 rounds)
- Multi-level permission system for granular access control

### 2. Network Security
- **Rate Limiting**: 60 requests/min for GET, 10-20/min for POST/PUT/DELETE
- **IP Blocking**: Automatic 1-hour block after 5 security violations
- **HTTPS Enforcement**: Strict-Transport-Security with preload
- **CSP**: Comprehensive Content Security Policy blocking inline scripts
- **CORS**: Configured for trusted origins only

### 3. Attack Prevention
- **SQL Injection**: Parameterized queries + pattern detection
- **XSS**: Input sanitization + CSP headers
- **CSRF**: Token validation for state-changing operations
- **Path Traversal**: URL path validation
- **Clickjacking**: X-Frame-Options and frame-ancestors CSP

### 4. Data Protection
- Input validation for all user data (phone, email, URLs, dates)
- UUID validation for all entity IDs
- Sanitization of user-generated content
- Franchisee data isolation (users only see their own data)
- Audit logging for sensitive operations

### 5. Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [comprehensive policy]
```

### 6. Monitoring & Logging
- Real-time security event logging
- 24-hour event retention
- Attack pattern detection
- Security statistics API (admin-only)
- Automatic cleanup of expired records

## Security Best Practices for Developers

### When Adding New API Endpoints:
```typescript
import { requireApiAuth, requireRoles, withRateLimit, validateUUIDs, sanitizeBody } from "@/lib/api-auth"

export async function POST(request: Request) {
  // 1. Rate limiting
  const rateLimitError = await withRateLimit(request, 10, 60000)
  if (rateLimitError) return rateLimitError

  // 2. Authentication
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  // 3. Authorization
  const rolesError = requireRoles(user, ["super_admin", "uk"])
  if (rolesError) return rolesError

  // 4. Input validation
  const body = await request.json()
  const sanitized = sanitizeBody(body)
  
  // 5. UUID validation if needed
  if (body.id) {
    const validationError = validateUUIDs({ id: body.id })
    if (validationError) return validationError
  }

  // Your logic here
}
```

### Environment Variables:
- `NEXTAUTH_SECRET`: Strong random string (min 32 chars)
- `DATABASE_URL`: Neon database connection string
- `NEXTAUTH_URL`: Production URL for callbacks

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please contact the security team immediately at security@questlegends.com

Do NOT create public GitHub issues for security vulnerabilities.

## Security Roadmap

### Planned Improvements:
- [ ] Two-factor authentication (2FA)
- [ ] Security audit logging to external service
- [ ] Automated vulnerability scanning
- [ ] Web Application Firewall (WAF) integration
- [ ] DDoS protection enhancements
- [ ] Regular penetration testing

### Current Limitations:
- Rate limiting is in-memory (resets on server restart)
- Security events are not persisted to database
- No email notifications for security events

## Compliance

This application implements security measures aligned with:
- OWASP Top 10 protections
- CIS Security Benchmarks
- GDPR data protection principles (for EU users)
