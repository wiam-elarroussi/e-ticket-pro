# Dockerfile générique, partagé par les 7 microservices NestJS/Prisma
# (auth, events, venue, pos, tickets, access, reports). Le service ciblé est
# déterminé par le "context" du build dans docker-compose.yml.

FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p prisma
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi
RUN npm run build

FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/tsconfig*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
CMD ["sh", "-c", "if [ -f prisma/schema.prisma ]; then for i in $(seq 1 15); do npx prisma migrate deploy && break; echo 'Base de données pas encore prête, nouvelle tentative dans 3s...'; sleep 3; done; fi; exec node dist/main.js"]
