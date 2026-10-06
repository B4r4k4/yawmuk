# Google Cloud Run image: builds the Vite game and serves it + the AI functions from server.mjs.
# ANTHROPIC_API_KEY is injected at runtime from Secret Manager (never baked into the image).
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
