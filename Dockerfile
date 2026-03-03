# Stage 1: Build client
FROM node:22-alpine AS client-builder
WORKDIR /app

# VITE_CLERK_PUBLISHABLE_KEY must be baked at build time (Vite inlines it)
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Copy workspace manifests + lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all workspace deps (creates node_modules/@demo/server symlink)
RUN npm ci

# Copy source for both (client imports types from server)
COPY server/src ./server/src
COPY server/tsconfig.json ./server/
COPY client/src ./client/src
COPY client/tsconfig.json ./client/
COPY client/vite.config.ts ./client/
COPY client/index.html ./client/

# Build client (produces client/dist/)
RUN npm run build --workspace=client

# Stage 2: Build server
FROM node:22-alpine AS server-builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci

COPY server/src ./server/src
COPY server/tsconfig.json ./server/
COPY server/migrations ./server/migrations

# Build server (produces server/dist/)
RUN npm run build --workspace=server

# Stage 3: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy server bundle, migrations, and hoisted deps
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/migrations ./server/migrations
COPY --from=server-builder /app/node_modules ./node_modules

# Copy client bundle into public/
COPY --from=client-builder /app/client/dist ./public

ENV NODE_ENV=production
CMD ["node", "server/dist/index.js"]
