# Stage 1: Base
FROM node:18.20.8-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# Stage 2: Dependencies
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    cp -R node_modules /tmp/node_modules && \
    npm ci

# Stage 3: Build
FROM dependencies AS build
COPY . .
RUN npm run build

# Stage 4: Production
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3004

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies and build
COPY --from=dependencies --chown=nodejs:nodejs /tmp/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3004/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Expose port
EXPOSE 3004

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
