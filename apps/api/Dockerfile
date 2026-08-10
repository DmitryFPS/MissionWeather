FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
RUN npm install -w @mission-weather/api
COPY apps/api ./apps/api
RUN npm run build -w @mission-weather/api

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY apps/api/package.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
