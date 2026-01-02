FROM node:18.20.8-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Development stage
FROM base AS development
RUN pnpm install --frozen-lockfile
COPY . .
CMD ["pnpm", "dev"]

# Build stage
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Production stage
FROM node:18.20.8-alpine AS production
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy package files and install production dependencies only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3003

CMD ["node", "dist/index.js"]
