---
paths:
  - "backend/**"
---

# API & Communication Standards

## 1. RESTful Design
- **Resources**: Use nouns, not verbs (e.g., `/transactions` instead of `/getTransactions`).
- **HTTP Methods**: 
  - `GET`: Read data.
  - `POST`: Create resource or trigger action.
  - `PATCH`: Partial update.
  - `PUT`: Full replacement.
  - `DELETE`: Remove resource.

## 2. Response Format
All API responses must follow a consistent structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional feedback message",
  "meta": { "pagination": { ... } } // For lists
}
```
Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable message",
    "details": [ ... ]
  }
}
```

## 3. Documentation (OpenAPI)
- Every endpoint must be documented with `@ApiProperty`, `@ApiOperation`, and `@ApiResponse` decorators (if using NestJS Swagger).
- Keep descriptions up-to-date and include example request/response bodies.

## 4. Versioning
- Use URI versioning (e.g., `/api/v1/...`). 
- Do not introduce breaking changes in the same version. Create a new version for breaking changes.
