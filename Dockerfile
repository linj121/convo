FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# https://githubcom/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# NOTE: This installs any missing dependencies for chrome-browser
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Install prod(non-dev) dependencies
FROM base AS prod-deps
 
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --prod

# We need the following to generate prisma client in node_modules:
# 1. prisma lib
# 2. prisma/client lib
# 3. prisma schema file (schema.prisma)
# Remove prisma from node_modules after client generation, we don't need it during runtime!
COPY src/data/prisma/schema.prisma ./src/data/prisma/schema.prisma
RUN pnpm generate && pnpm remove prisma

# Prune trashes in node_modules
RUN wget https://gobinaries.com/tj/node-prune --output-document - | /bin/sh && node-prune

# Stage 3: Install all dependencies and build the app
FROM base AS build
 
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# Copy all neccessary source codes
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Generate local db
RUN pnpm migrate:prod
RUN pnpm build

# Stage 4: Copy the built result and the dependencies to the final image
FROM base
 
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/localdb ./localdb
COPY --from=build /app/build ./build
COPY assets ./assets

ENV NODE_ENV=production

CMD ["node", "build/index.js"]
