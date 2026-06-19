# Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.scripts.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application (compiles src/ to dist/) and seed scripts (compiles scripts/ to dist/scripts/)
RUN npm run build && npm run build:scripts

# --- Dev stage (used by docker-compose.dev.yml) ---
# Keeps ALL dependencies including devDependencies
FROM builder AS dev

# No pruning here — devDependencies stay for nest start --watch, ts-node, etc.
CMD ["npm", "run", "start:dev"]

# --- Production stage ---
FROM node:20-bookworm-slim

WORKDIR /app

# Install Python + pdfplumber for PDF parsing + pdf2image for thumbnails
RUN apt-get update && \
  apt-get install -y --no-install-recommends python3 python3-pip python3-pil poppler-utils && \
  pip3 install --no-cache-dir --break-system-packages pdfplumber==0.11.4 pdf2image==1.17.0 && \
  rm -rf /var/lib/apt/lists/*

# Runtime dependencies from builder (pruned)
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Prune devDependencies for production
RUN npm prune --omit=dev

# Create uploads directory and reports subdirectory
RUN groupadd --system app && useradd --system --gid app app && \
  mkdir -p uploads/reports && \
  chown -R app:app /app

USER app

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
