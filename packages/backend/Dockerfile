# Base stage
FROM node:22.11.0-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@latest

# Dependencies stage
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/backend/prisma ./packages/backend/prisma/
WORKDIR /app/packages/backend
RUN pnpm install --frozen-lockfile
RUN npx prisma generate

# Development stage
FROM base AS development
WORKDIR /app/packages/backend
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/backend/node_modules ./node_modules
COPY packages/backend .
EXPOSE 3001
CMD ["pnpm", "run", "start:dev"]

# Builder stage
FROM base AS builder
WORKDIR /app/packages/backend
COPY --from=dependencies /app/node_modules ./../../node_modules
COPY --from=dependencies /app/packages/backend/node_modules ./node_modules
COPY packages/backend .
RUN npx prisma generate
RUN pnpm run build
RUN pnpm prune --prod

# Production stage
FROM node:22.11.0-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/packages/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/backend/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/backend/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/backend/package.json ./

USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node", "dist/main.js"]
