FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci rejects the lockfile: it was written on Windows and lacks Linux optional deps.
RUN npm install --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
# scripts/migrate.mjs is not traced by Next, so copy its imports and the SQL explicitly.
COPY --from=build --chown=app:app /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=app:app /app/node_modules/postgres ./node_modules/postgres
COPY --from=build --chown=app:app /app/scripts ./scripts
COPY --from=build --chown=app:app /app/drizzle ./drizzle
USER app
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]
