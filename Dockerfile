# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better caching
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies for both apps
RUN npm ci --prefix backend
RUN npm ci --prefix frontend

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend with API proxy baked in
ARG API_PORT=4000
ENV API_PORT=${API_PORT}
ARG API_PROXY_TARGET=http://127.0.0.1:${API_PORT}
ENV API_PROXY_TARGET=${API_PROXY_TARGET}
ENV NEXT_PUBLIC_API_URL=/api/v1
RUN npm run build --prefix frontend

# Build backend
RUN npm run build --prefix backend

# Remove devDependencies from backend for the runtime image
RUN npm --prefix backend prune --omit=dev

# Runtime image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV API_PORT=4000
ENV HOSTNAME=0.0.0.0
ENV PIP_BREAK_SYSTEM_PACKAGES=1

# Install Python + pdfplumber for PDF parsing + pdf2image for thumbnails
RUN apk add --no-cache python3 py3-pip py3-pillow poppler-utils && \
    pip3 install --no-cache-dir --break-system-packages pdfplumber==0.11.4 pdf2image==1.17.0

# Backend runtime dependencies (already pruned)
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Backend runtime files
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/scripts ./backend/scripts

# Frontend standalone output
COPY --from=builder /app/frontend/.next/standalone ./frontend
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/package*.json ./frontend/

# Startup script to run both servers
COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh

# Use non-root user for runtime
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD ["node", "-e", "const http=require('http'); const port=process.env.API_PORT||4000; http.get('http://127.0.0.1:'+port+'/api/v1/health/ready', (r)=>process.exit(r.statusCode===200?0:1)).on('error', ()=>process.exit(1));"]

CMD ["./scripts/start.sh"]
