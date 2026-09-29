# Etapa 1: construir la app
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: servir la app con nginx
FROM nginx:1.27-alpine
COPY --from=build /app/dist/avisa/browser/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
