# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Requires vbwd-fe-core submodule (clone with --recurse-submodules)
COPY . .

# Build shared component library first so the file: dependency resolves
RUN cd vbwd-fe-core && rm -f package-lock.json && npm install && npm run build && rm -rf node_modules

# Install and build main application
# Remove lockfile so npm resolves platform-specific optional deps (e.g. @rollup/rollup-linux-x64-musl)
RUN rm -f package-lock.json && npm install

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# HMAC secret baked into the fe-admin bundle at build time. Must match the
# value the fe-user plugin-api sidecar uses at runtime (PLUGIN_API_SECRET).
# Passed by CI via --build-arg. Empty default so plain `docker build` works;
# the User Plugins tab is non-functional without a real value.
ARG VITE_PLUGIN_API_SECRET=""
ENV VITE_PLUGIN_API_SECRET=$VITE_PLUGIN_API_SECRET

# Base URL for /_plugins calls. Default empty = same-origin relative path, so
# the browser hits the current host's /_plugins rather than localhost:8080.
ARG VITE_USER_APP_URL=""
ENV VITE_USER_APP_URL=$VITE_USER_APP_URL

RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.prod.conf.template /etc/nginx/templates/default.conf.template

# API_UPSTREAM is the backend service host:port within the Docker network.
# Override at runtime via environment variable, e.g. API_UPSTREAM=api:5000
ENV API_UPSTREAM=api:5000
ENV PLUGIN_API_UPSTREAM=plugin-api:3001

EXPOSE 80
