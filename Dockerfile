# Critter Connect web app (Next.js) and the website's Caddy image. Built and run on the VPS next to the
# database: docker compose -f deploy/docker-compose.app.yml --project-directory . up -d --build
# (docs/DEPLOY.md). NEXT_PUBLIC_* values are baked into the browser bundle at
# build time, so they are build args; server secrets come in at run time.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

FROM deps AS build
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
# The build loads route modules but never queries; the real URL comes at run time.
RUN DATABASE_URL=postgres://build@127.0.0.1:1/build npm run build

# The website (plan 051 §10): static files for critterconnect.org. No Clerk key or database needed.
FROM deps AS site
RUN npm run site:build

# HTTPS front door for the game (play.) and the website (apex, www); see deploy/Caddyfile.
FROM caddy:2 AS caddy
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=site /app/out/site /srv/site

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY next.config.mjs ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/api/places/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["npx", "next", "start", "-p", "8080"]
