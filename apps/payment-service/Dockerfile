# ===============================================
# STAGE 1: BASE
# Node.js base image with dependencies
# ===============================================
FROM node:18.20.8-alpine AS base

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    tini \
    curl

# ===============================================
# STAGE 2: DEPENDENCIES
# Install production dependencies
# ===============================================
FROM base AS dependencies

COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# ===============================================
# STAGE 3: BUILD
# Build TypeScript application
# ===============================================
FROM base AS build

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# Build application
RUN npm run build

# ===============================================
# STAGE 4: PRODUCTION
# Production-ready image
# ===============================================
FROM base AS production

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Copy package.json for version info
COPY --chown=nodejs:nodejs package.json ./

USER nodejs

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/index.js"]
