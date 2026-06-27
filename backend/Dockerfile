FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=development
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY backend ./backend
EXPOSE 4000
CMD ["npm", "run", "dev", "-w", "@hackathon/backend"]
