---
paths:
  - "backend/**"
---

# Clean Architecture Standards

## Separation of Concerns
The project must be strictly divided into layers to ensure maintainability and testability.

### 1. Domain Layer (Core)
- Contains business logic, entities, and repository interfaces.
- **NO** dependencies on external frameworks (NestJS, TypeORM, etc.).
- Defines "What" the system does, not "How".

### 2. Application Layer (Use Cases)
- Orchestrates the flow of data to and from entities.
- Contains service logic that implements specific business use cases.
- Uses DTOs (Data Transfer Objects) for communication with the outside world.

### 3. Infrastructure Layer (Adapters)
- Implementation of repository interfaces (TypeORM, Prisma, etc.).
- External API clients.
- Configuration and logging.

### 4. Interface Layer (Controllers/UI)
- Handlers for HTTP requests (Controllers).
- GraphQL Resolvers.
- Validates input data using Class-Validator.

## Data Flow Rules
1. **Dependency Direction**: Outer layers depend on inner layers. Inner layers (Domain) should never know about outer layers (Controllers/Database).
2. **DTO Usage**: Never return database entities directly to the client. Always use DTOs to decouple the API contract from the database schema.
3. **Module Isolation**: Modules should be as independent as possible. Communication between modules should happen via well-defined services or event emitters.
