# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Lumio seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Where to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to the [Security tab](../../security/advisories/new) of this repository
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Email**
   - Send an email to the project maintainers
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability

### What to Include

Please include the following information in your report:

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it
- Any suggested fixes or mitigations

### What to Expect

After you submit a report, here's what will happen:

1. **Acknowledgment**: We'll acknowledge receipt of your vulnerability report within 48 hours
2. **Initial Assessment**: We'll provide an initial assessment within 7 days
3. **Updates**: We'll keep you informed about our progress as we work on a fix
4. **Resolution**: Once the vulnerability is fixed, we'll notify you and publicly disclose it (with credit to you, if desired)

### Disclosure Policy

- We ask that you give us a reasonable amount of time to fix the vulnerability before any public disclosure
- We aim to fix critical vulnerabilities within 30 days
- Once a fix is available, we will:
  - Release a security update
  - Publish a security advisory
  - Credit you for the discovery (unless you prefer to remain anonymous)

## Security Best Practices

When deploying Lumio, please follow these security best practices:

### Environment Variables

- **Never commit** `.env` files to version control
- Use **strong, randomly generated secrets** for JWT tokens:
  ```bash
  openssl rand -base64 32
  ```
- Change default secrets before deploying to production
- Rotate secrets periodically

### Database Security

- Use strong passwords for database users
- Restrict database access to trusted networks only
- Enable SSL/TLS for database connections in production
- Regularly backup your database

### API Security

- Always use HTTPS in production
- Set up proper CORS policies
- Implement rate limiting
- Keep JWT token expiration times reasonable (1 hour for access tokens)

### Docker Security

- Don't run containers as root
- Keep base images updated
- Scan images for vulnerabilities regularly
- Use Docker secrets for sensitive data in production

### Dependencies

- Regularly update dependencies to patch known vulnerabilities
- Use `npm audit` to check for vulnerable packages
- Consider using automated tools like Dependabot

### Access Control

- Follow the principle of least privilege
- Use role-based access control (RBAC) properly
- Enable multi-factor authentication when available
- Regularly audit user permissions

## Known Security Considerations

### JWT Tokens

- Access tokens expire after 1 hour by default
- Refresh tokens expire after 30 days by default
- Tokens are stored in HTTP-only cookies (when possible)
- Always use strong, unique secrets for JWT signing

### File Uploads

- Uploaded files are validated and sanitized
- File size limits are enforced
- Only allowed file types can be uploaded
- Files are stored outside the web root

### Google OAuth Integration

- OAuth tokens are securely stored and encrypted
- Scopes are limited to minimum required permissions
- Tokens are refreshed automatically before expiration

## Security Updates

We will announce security updates through:

- GitHub Security Advisories
- Release notes
- GitHub Releases page

Subscribe to repository notifications to stay informed.

## Vulnerability Disclosure Timeline

We follow responsible disclosure practices:

1. **Day 0**: Vulnerability reported
2. **Day 2**: Initial acknowledgment to reporter
3. **Day 7**: Assessment completed and severity determined
4. **Day 30**: Fix developed and tested (for critical issues)
5. **Day 90**: Public disclosure (or earlier if agreed with reporter)

## Bug Bounty Program

We currently do not have a bug bounty program, but we deeply appreciate security researchers who help us keep Lumio secure. We will:

- Credit you in our security advisories (with your permission)
- Thank you in our release notes
- List you in our contributors

## Contact

For security-related questions that are not vulnerabilities, you can:

- Open a GitHub Discussion in the Security category
- Contact the maintainers through GitHub

## Additional Resources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)

---

Thank you for helping keep Lumio and our users safe!
