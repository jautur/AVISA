# Etapa 1: construir la app
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: servir la app con nginx
FROM nginx:alpine
COPY --from=build /app/dist/avisa/browser/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
