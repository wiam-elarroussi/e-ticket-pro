FROM node:20-slim AS build
WORKDIR /app

# Les variables NEXT_PUBLIC_* sont figées dans le bundle au moment du build
# (limitation Next.js) — les valeurs par défaut correspondent aux ports
# exposés sur localhost par docker-compose.yml.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_EVENTS_API_URL=http://localhost:3002
ARG NEXT_PUBLIC_VENUE_API_URL=http://localhost:3003
ARG NEXT_PUBLIC_POS_API_URL=http://localhost:3004
ARG NEXT_PUBLIC_TICKETS_API_URL=http://localhost:3005
ARG NEXT_PUBLIC_ACCESS_API_URL=http://localhost:3007
ARG NEXT_PUBLIC_REPORTS_API_URL=http://localhost:3008
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_EVENTS_API_URL=$NEXT_PUBLIC_EVENTS_API_URL \
    NEXT_PUBLIC_VENUE_API_URL=$NEXT_PUBLIC_VENUE_API_URL \
    NEXT_PUBLIC_POS_API_URL=$NEXT_PUBLIC_POS_API_URL \
    NEXT_PUBLIC_TICKETS_API_URL=$NEXT_PUBLIC_TICKETS_API_URL \
    NEXT_PUBLIC_ACCESS_API_URL=$NEXT_PUBLIC_ACCESS_API_URL \
    NEXT_PUBLIC_REPORTS_API_URL=$NEXT_PUBLIC_REPORTS_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3006
CMD ["npm", "run", "start", "--", "-p", "3006"]
