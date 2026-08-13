# ---- base: shared deps ----
FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json .npmrc ./
COPY prisma ./prisma
RUN npm ci

# ---- build (compiles TS + generates Prisma client) ----
FROM base AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- dev (hot reload via tsx watch) ----
FROM base AS dev
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- production ----
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/server.js"]
