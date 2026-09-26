# ─────────────────────────────────────────────────────────────────────────
# Dockerfile multi-étages pour Fihirana Jazz (Vite + React TS).
#
#   • cible "dev"  : serveur Vite avec hot-reload (utilisé par docker-compose)
#   • cible "prod" : build statique servi par Nginx (déploiement)
#
# Dev  :  docker compose up
# Prod :  docker build --target prod -t fihirana-jazz .
#         docker run -p 8080:80 fihirana-jazz
# ─────────────────────────────────────────────────────────────────────────

# ---- Base commune : dépendances -------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- Cible développement (hot-reload) -------------------------------------
FROM node:20-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ---- Étape build (compile le bundle statique) -----------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Les variables VITE_* sont injectées AU BUILD (passées via --build-arg).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build

# ---- Cible production (Nginx) ---------------------------------------------
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
