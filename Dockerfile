# Production image for Rio Apex (Next.js 14 + better-sqlite3).
# Works on Railway, Render, Fly.io, or any VPS. The SQLite file lives at
# /app/data/jaguar.db — mount a PERSISTENT VOLUME there so data survives deploys.
FROM node:20-slim AS base

# better-sqlite3 compiles a native addon → needs build toolchain.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps (cached unless package files change)
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# SQLite data dir (mount a volume here in production)
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
