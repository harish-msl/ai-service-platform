# Base stage
FROM node:22.11.0-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@latest

# Dependencies stage
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile --filter frontend
WORKDIR /app/packages/frontend

# Development stage
FROM base AS development
COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=dependencies /app/packages/frontend/node_modules /app/packages/frontend/node_modules
WORKDIR /app/packages/frontend
COPY packages/frontend .
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# Builder stage
FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_NAME

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/packages/frontend
COPY --from=dependencies /app/node_modules ./../../node_modules
COPY --from=dependencies /app/packages/frontend/node_modules ./node_modules
COPY packages/frontend .

RUN pnpm run build

# Production stage
FROM node:22.11.0-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nextjs -u 1001

# Copy the entire pnpm store to root level (where symlinks in standalone expect it)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules /node_modules

# Copy standalone output and static files
COPY --from=builder --chown=nextjs:nodejs /app/packages/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/frontend/.next/static ./.next/static

# Create public directory (Next.js doesn't require it if no static files)
RUN mkdir -p ./public

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node", "server.js"]
