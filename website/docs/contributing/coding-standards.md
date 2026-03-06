---
title: Coding Standards
description: TypeScript conventions and formatting
---

Lumio uses Biome for linting and formatting. Follow existing naming conventions across the codebase.

## Language and formatting

- TypeScript everywhere
- Prefer `const`
- Avoid `any`
- Keep functions small and focused

## Naming conventions

- `camelCase` for variables and functions
- `PascalCase` for classes and types
- `UPPER_SNAKE_CASE` for constants

## Lint and format

```bash
make lint
make format
```

## Code review expectations

- Ensure tests cover new behavior
- Document any breaking changes
- Add migration notes for schema updates

Next: [Adding a Bank Parser](adding-a-bank-parser)
