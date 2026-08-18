# ---- deps & build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- dev (hot reload, used by docker-compose for local dev) ----
FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ---- production (default target; last stage so Railway builds this) ----
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
# Official nginx image runs envsubst on templates/*.template. Restrict it
# to PORT so nginx's own $uri / $host variables are left alone.
ENV PORT=80
ENV NGINX_ENVSUBST_FILTER=^PORT$
EXPOSE 80
