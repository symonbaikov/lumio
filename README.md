# FinFlow

<div align="center">

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)


**Open-source financial data platform for importing, processing, and analyzing bank statements**

[Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](CONTRIBUTING.md) • [Community](#community)

</div>

---

[![Maintainability](https://qlty.sh/gh/symonbaikov/projects/parse-ledger/maintainability.svg)](https://qlty.sh/gh/symonbaikov/projects/parse-ledger)
[![Code Coverage](https://qlty.sh/gh/symonbaikov/projects/parse-ledger/coverage.svg)](https://qlty.sh/gh/symonbaikov/projects/parse-ledger)
---

## ✨ Features

FinFlow is a comprehensive web application designed for importing and processing bank statements, organizing financial data, and enabling team collaboration:

- 📄 **Bank Statement Import** - Upload and parse bank statements (PDF, CSV) with intelligent header extraction
- 🏗️ **Custom Tables** - Create custom data structures for flexible financial tracking
- 📊 **Google Sheets Integration** - Sync data with Google Sheets in real-time
- 👥 **Workspace Collaboration** - Invite team members with granular role-based permissions
- 🎯 **Interactive Tours** - Guided onboarding with 10 feature tours in 3 languages
- 🔐 **Enterprise Auth** - SSO, RBAC, and MFA support (roadmap)
- 📱 **Telegram Bot** - Automated financial reports via Telegram
- 📚 **API Documentation** - Interactive Swagger/OpenAPI docs
- 🐳 **Docker Ready** - One-command deployment with Docker Compose

## 🛠️ Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [TypeORM](https://typeorm.io/)
- **Cache**: [Redis](https://redis.io/) - For queues and background jobs
- **API Docs**: [Swagger](https://swagger.io/) - Interactive API documentation at `/api/docs`
- **Queue**: [Bull](https://github.com/OptimalBits/bull) - Distributed job and message queue

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) - React framework with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom UI components
- **UI Components**: shadcn/ui primitives + Material-UI for admin screens
- **HTTP Client**: [Axios](https://axios-http.com/)
- **i18n**: [Intlayer](https://intlayer.org/) - Internationalization

### DevOps & Observability
- **Containerization**: Docker & Docker Compose
- **Monitoring**: Prometheus & Grafana
- **CI/CD**: GitHub Actions

## 📁 Repository Structure

```
parse-ledger/
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── modules/        # Feature modules (auth, users, statements, etc.)
│   │   ├── entities/       # TypeORM database entities
│   │   ├── common/         # Shared utilities, decorators, guards
│   │   └── config/         # Configuration management
│   ├── test/               # Unit and E2E tests
│   └── migrations/         # Database migrations
├── frontend/                # Next.js application
│   ├── app/                # Next.js App Router pages
│   │   ├── (auth)/        # Authentication pages
│   │   ├── admin/         # Admin dashboard
│   │   ├── components/    # Reusable React components
│   │   └── ...
│   └── public/            # Static assets
├── docs/                   # Project documentation
├── observability/          # Prometheus & Grafana configs
├── scripts/                # Helper scripts
├── docker-compose.yml      # Production Docker config
├── docker-compose.dev.yml  # Development overrides (hot reload)
└── Makefile                # Common development commands
```

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js 18+](https://nodejs.org/) (only for local mode)

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/symonbaikov/financify.git
cd financify
make quick-dev
```

Then open `http://localhost:3000` and login:
- Email: `demo@finflow.dev`
- Password: `demo123`

### Option 2: Local Development

```bash
git clone https://github.com/symonbaikov/financify.git
cd financify
make db-start
npm install
npm install --prefix backend
npm install --prefix frontend
npm run dev
make seed-demo
```

Then open `http://localhost:3000` and login with `demo@finflow.dev` / `demo123`.

No `.env` files are required for development. For production and integrations, see Configuration below.


## ⚙️ Configuration

### Development defaults

No environment variables are required in development mode.

| Setting | Default |
|---------|---------|
| `DATABASE_URL` | `postgresql://finflow:finflow@localhost:5432/finflow` |
| `REDIS_URL` | `redis://localhost:6379` |
| `PORT` | `3001` |
| JWT secrets | Built-in development defaults (disabled in production) |

To override any value locally, create `backend/.env` and/or `frontend/.env.local`.
Minimal templates are available in `backend/.env.example` and `frontend/.env.local.example`.
The full backend reference is in `backend/.env.all-options`.

### Production required variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for access token signing |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing |

### Optional Integrations

<details>
<summary><b>Google OAuth & Sheets</b></summary>

```bash
# backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback
```

[Setup Guide →](docs/google-sheets-integration-plan.md)
</details>

<details>
<summary><b>Telegram Bot</b></summary>

```bash
# backend/.env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

Get token from [@BotFather](https://t.me/botfather)
</details>

<details>
<summary><b>Email (Resend)</b></summary>

```bash
# backend/.env
RESEND_API_KEY=re_your-api-key
RESEND_FROM="FinFlow <noreply@your-domain.com>"
```

[Get API key →](https://resend.com)
</details>

### Generating production secrets

```bash
# Generate JWT secrets
openssl rand -base64 32
```

Or use the helper script for local override files:
```bash
bash scripts/generate-env.sh
```

---

## 👤 User Management

### Demo User

Create a local demo user with workspace defaults:

```bash
make seed-demo
```

Credentials:
- Email: `demo@finflow.dev`
- Password: `demo123`

### Create Admin User

**Using Docker:**
```bash
docker exec -it finflow-backend npm run create-admin -- \
  admin@example.com \
  admin123 \
  "Admin User"
```

**Using Makefile:**
```bash
make admin email=admin@example.com password=admin123 name="Admin User"
```

**Local Development:**
```bash
cd backend
npm run create-admin -- admin@example.com admin123 "Admin User"
```

---

## 🧪 Testing

FinFlow includes comprehensive test suites for both backend and frontend.

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### Storybook

FinFlow uses Storybook for component development and documentation.

#### Local Development

```bash
cd frontend

# Start Storybook development server
npm run storybook

# Build Storybook (static files)
npm run storybook:build
```

Storybook will be available at http://localhost:6006

#### CI/CD Integration

Storybook is automatically built and published as artifacts:

**For Pull Requests:**
- Storybook is built on every PR that changes frontend files
- Artifacts are available for 7 days
- A comment with download instructions is posted to the PR

**For Main Branch:**
- Storybook is built on every push to main
- Artifacts are available for 30 days

#### Viewing CI Storybook Artifacts

**Option 1: Direct Download**
1. Go to GitHub Actions runs
2. Find the completed Storybook workflow
3. Download the `storybook-pr` or `storybook-main` artifact
4. Extract and serve locally with `npx http-server storybook-static -p 6006`

**Option 2: Using Helper Scripts**

```bash
# Download latest Storybook from CI
./scripts/storybook-download.sh

# Download and serve Storybook locally
./scripts/storybook-serve.sh

# Download specific run and serve
./scripts/storybook-download.sh <run-id>
./scripts/storybook-serve.sh storybook-downloaded
```

**Option 3: GitHub CLI**

```bash
# List recent Storybook runs
gh run list --workflow="storybook.yml" --limit 5

# Download specific run
gh run download <run-id> --name "storybook-pr"

# Download latest successful run
gh run download --name "storybook-ci"
```

#### Storybook Structure

- **Components**: UI components with interactive examples
- **Pages**: Full page layouts and components
- **Transactions**: Transaction-related components and views
- **Modals**: Dialog and modal components
- **Mock Data**: Sample data for development

Stories are located in `frontend/app/stories/` and follow the pattern `*.stories.tsx`.

### Docker Testing

```bash
# Run backend tests in Docker
docker exec -it finflow-backend npm test

# Run with Makefile
make test
make test-backend
make test-frontend
make test-cov  # With coverage report
```

**Coverage Reports**: Generated in `backend/coverage/lcov-report/index.html`

---

## 🏗️ Development

### Project Structure

Key directories:

- `backend/src/modules/` - Feature modules (auth, users, statements, etc.)
- `backend/src/entities/` - TypeORM database entities
- `backend/src/common/` - Shared utilities, decorators, guards
- `frontend/app/` - Next.js pages and components
- `docs/` - Project documentation

### Common Commands

**Using Makefile** (recommended):

```bash
make help              # Show all available commands
make start             # Start all services
make dev               # Start in development mode (hot reload)
make stop              # Stop all services
make logs              # View logs
make logs-backend      # View backend logs only
make test              # Run all tests
make migrate           # Run database migrations
make shell-backend     # Open shell in backend container
make health            # Check service health
make storybook         # Start Storybook development server
make storybook-build   # Build Storybook for production
```

**Using npm:**

```bash
# Backend
cd backend
npm run start:dev      # Development with hot reload
npm run build          # Build for production
npm run migration:generate -- MigrationName  # Generate migration
npm run migration:run  # Run migrations

# Frontend
cd frontend
npm run dev            # Development server
npm run build          # Production build
npm run lint           # Lint code
npm run storybook      # Storybook development server
npm run storybook:build # Build Storybook for production
```

### Hot Reload

Development mode (`docker-compose.dev.yml`) supports hot reload:

```bash
make dev
# or
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Changes to source files will automatically reload the services.

---

## 📊 Monitoring & Observability

FinFlow includes a complete observability stack with Prometheus and Grafana.

### Start Monitoring Stack

```bash
# Using Docker Compose
docker-compose -f docker-compose.observability.yml up -d

# Using Makefile
make observability
```

### Access Monitoring Tools

- **Prometheus**: http://localhost:9090
  - Metrics collection and querying
  - Service health monitoring
  
- **Grafana**: http://localhost:3002
  - Default credentials: `admin` / `admin`
  - Pre-configured dashboards
  - Real-time metrics visualization

### Configuration

Monitoring configs are in `observability/`:
- `prometheus.yml` - Prometheus configuration
- `grafana/` - Grafana datasources and dashboards

### Stop Monitoring

```bash
make observability-stop
# or
docker-compose -f docker-compose.observability.yml down
```

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

### Getting Started
- [README.md](README.md) - This file
- [DOCKER.md](DOCKER.md) - Detailed Docker setup guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute

### Architecture & Design
- [architecture.md](docs/architecture.md) - System architecture overview
- [arch-rules.md](docs/arch-rules.md) - Architecture principles and rules
- [api.md](docs/api.md) - API documentation

### Features
- [requirements.md](docs/requirements.md) - Project requirements
- [plan.md](docs/plan.md) - Development roadmap
- [google-sheets-integration-plan.md](docs/google-sheets-integration-plan.md) - Sheets integration
- [custom-tables-implementation-phases.md](docs/custom-tables-implementation-phases.md) - Custom tables

### Deployment
- [RAILWAY.md](RAILWAY.md) - Railway deployment guide
- [RAILWAY_SETUP_COMPLETE.md](docs/RAILWAY_SETUP_COMPLETE.md) - Railway configuration
- [DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist

### Security & Community
- [SECURITY.md](SECURITY.md) - Security policy and vulnerability reporting
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community guidelines
- [LICENSE](LICENSE) - MIT License

### Interactive API Docs

Swagger documentation is available at:
- http://localhost:3001/api/docs (when running)

---

## 🚢 Deployment

### Docker Production

```bash
# Build and start
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Railway

FinFlow can be deployed to Railway with automatic migrations:

1. Push to GitHub
2. Connect Railway to your repository
3. Configure environment variables
4. Deploy automatically on push

See [RAILWAY.md](RAILWAY.md) for detailed instructions.

### Environment-Specific Configs

- `docker-compose.yml` - Production configuration
- `docker-compose.dev.yml` - Development overrides (hot reload)
- `docker-compose.observability.yml` - Monitoring stack

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Ways to Contribute

- 🐛 **Report bugs** - Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- ✨ **Suggest features** - Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml)
- 📝 **Improve documentation** - Help make docs clearer
- 🔧 **Submit pull requests** - Fix bugs or add features
- 🧪 **Write tests** - Improve test coverage
- 🌍 **Translate** - Help with internationalization

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Write/update tests**
5. **Run tests** (`make test`)
6. **Commit** following [Conventional Commits](https://www.conventionalcommits.org/)
   ```bash
   git commit -m "feat(statements): add CSV import support"
   ```
7. **Push to your fork** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Code Style

- TypeScript with strict mode
- Biome for linting and formatting
- Run `make lint` (and `make format` if needed) before committing
- Follow existing code patterns

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Pull Request Process

1. Ensure all tests pass
2. Update documentation
3. Follow the PR template
4. Request review from maintainers
5. Address review feedback

For detailed guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 👥 Community

### Get Help

- 💬 **GitHub Discussions** - Ask questions and share ideas
- 🐛 **GitHub Issues** - Report bugs or request features
- 📖 **Documentation** - Check the docs first

### Stay Updated

- ⭐ **Star this repo** to follow updates
- 👀 **Watch** for notifications
- 🔔 **Subscribe** to releases

### Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 🔒 Security

Security is a top priority. See [SECURITY.md](SECURITY.md) for:
- Supported versions
- How to report vulnerabilities
- Security best practices
- Disclosure policy

**Found a security issue?** Please report it privately through GitHub Security Advisories, not in public issues.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2026 FinFlow Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 Acknowledgments

Built with amazing open-source technologies:
- [NestJS](https://nestjs.com/) - Backend framework
- [Next.js](https://nextjs.org/) - Frontend framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [TypeORM](https://typeorm.io/) - ORM
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- And many more...

---

## 📞 Support

- 📖 **Documentation**: Check the `docs/` directory
- 💬 **Discussions**: [GitHub Discussions](../../discussions)
- 🐛 **Issues**: [GitHub Issues](../../issues)
- 🔐 **Security**: See [SECURITY.md](SECURITY.md)

---

<div align="center">

**[⬆ back to top](#finflow)**

Made with ❤️ by the FinFlow community

</div>
