FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

ENV PORT=7000
ENV NODE_ENV=production

EXPOSE 7000
CMD ["node", "server.js"]
