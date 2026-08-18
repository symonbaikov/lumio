---
paths:
  - "backend/**"
---

# Security & Privacy Standards

## 1. Authentication & Session Management
- **JWT Storage**: Use `HttpOnly`, `Secure`, and `SameSite=Strict` cookies for storing access and refresh tokens. Never store sensitive tokens in `localStorage`.
- **Token Rotation**: Implement refresh token rotation to detect and prevent token theft.
- **Session Expiry**: Set reasonable expiration times for sessions (e.g., 15-30 minutes for access tokens).

## 2. Data Protection (PII)
- **Encryption at Rest**: Sensitive data (bank details, personal names, keys) must be encrypted in the database using high-standard algorithms (AES-256).
- **Masking**: Display only the last 4 digits of bank accounts or cards in the UI.
- **Sanitization**: All user inputs must be sanitized using `class-validator` and `DOMPurify` to prevent XSS and SQL injection.

## 3. Authorization (RBAC/ABAC)
- **Fail-Safe Defaults**: Access must be denied by default. Explicitly grant permissions.
- **Multi-Level Check**: Check permissions at the Controller level (Interceptor/Guard) AND at the Domain/Service level to prevent vertical/horizontal privilege escalation.
- **Tenant Isolation**: Every query must include a `workspaceId` or `ownerId` check to ensure the user cannot access data from other tenants.

## 4. API Security
- **CORS**: Configure strict CORS policies, allowing only the designated frontend domain.
- **Rate Limiting**: Implement rate limiting on sensitive endpoints (Login, Reset Password, Withdraw).
- **Security Headers**: Use `Helmet.js` to set `Content-Security-Policy`, `X-Frame-Options`, etc.
