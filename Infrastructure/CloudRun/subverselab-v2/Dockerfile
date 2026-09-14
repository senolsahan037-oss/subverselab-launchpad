FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/.agents ./.agents
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
