# subverselab-site: pages only (dist + the static server.js). The API is api/ with its own Dockerfile.
# VITE_API_BASE / VITE_MEDIA_BASE empty = today's same-origin build; set = split build (docs/SPLIT_CUTOVER.md).
# Both come from build.env (gcloud run deploy --source cannot pass build args).
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN set -a && . ./build.env && set +a && npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./
COPY --from=build /app/dist ./dist
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
