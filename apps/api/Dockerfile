FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
RUN npm ci

COPY packages/types packages/types
COPY apps/api apps/api

# Build types package
WORKDIR /app/packages/types
RUN npm run build

# Generate prisma client and build api
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev

COPY --from=builder /app/packages/types/dist /app/packages/types/dist
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/apps/api/node_modules/.prisma /app/apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/prisma /app/apps/api/prisma

EXPOSE 5001
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
