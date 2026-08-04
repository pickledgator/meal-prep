# --- Stage 1: build the SPA + bundle the server ---
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter web build
RUN pnpm --filter server build

# --- Stage 2: slim runtime (bundled server + built SPA; only @libsql/client stays external) ---
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/server/package.json ./server-package.json
RUN npm install --no-save --omit=dev "@libsql/client@$(node -p "require('./server-package.json').dependencies['@libsql/client']")" \
  && rm server-package.json
ENV NODE_ENV=production PORT=8080 WEB_DIST=web/dist
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
