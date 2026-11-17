FROM node:20-slim

# Install dependencies for Playwright and system utilities
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
    libgconf-2-4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libnspr4 \
    libnss3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and npm configuration
COPY package*.json ./
COPY .npmrc* ./
COPY prisma ./prisma/

# Install dependencies strictly from lockfile (no silent fallback to unpinned npm install)
RUN npm ci --legacy-peer-deps

# Copy application source code
COPY . .

# Install Playwright browser dependencies
RUN npx playwright install chromium --with-deps

# Provide build-time values so next build / prisma generate succeeds
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
ARG DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_SUPER_ADMIN_EMAIL=""
ARG CLERK_SECRET_KEY="dummy_build_key"

ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_SUPER_ADMIN_EMAIL=${NEXT_PUBLIC_SUPER_ADMIN_EMAIL}
ENV CLERK_SECRET_KEY=${CLERK_SECRET_KEY}

# Generate Prisma client and build Next.js production bundle
RUN npx prisma generate
RUN npm run build

# Run as non-root user for container hardening
RUN chown -R node:node /app
USER node

# Expose Next.js server port
EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
