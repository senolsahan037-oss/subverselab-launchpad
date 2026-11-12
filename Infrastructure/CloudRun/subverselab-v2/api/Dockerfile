# subverselab-api. Build from this folder: gcloud run deploy subverselab-api --source api …  (docs/SPLIT_CUTOVER.md)
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js launchLicence.js entitlements.js accountDeletion.js credits.js inbox.js stats.js appstore.js catalog.js catalogSchema.js agents.js trialGrant.js partners.js redeem.js redeemCodes.json ./
COPY AppleRootCA-G3.cer ./
COPY tester-agreements ./tester-agreements
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
