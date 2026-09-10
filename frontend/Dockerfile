# React frontend. Build the static bundle with Node, then serve it with nginx.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time. This must be the URL the BROWSER uses to
# reach the .NET backend (i.e. the host-published port), not a compose hostname.
ARG VITE_API_URL=http://localhost:5038
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
