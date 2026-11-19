# Agenda Point do Ingresso — imagem de produção (Shard Cloud / qualquer Docker)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Variáveis públicas (VITE_*) entram no bundle do navegador no build.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=80 HOST=0.0.0.0
COPY --from=build /app/.output ./.output
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:${PORT}/manifest.webmanifest >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
