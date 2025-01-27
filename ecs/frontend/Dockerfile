FROM node:18 as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

# Install envsubst utility
RUN apk add --no-cache gettext

# Copy the built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

RUN mkdir -p /var/run/nginx /var/cache/nginx && \
    chmod -R 777 /var/run/nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

EXPOSE 80

# Use entrypoint script to substitute environment variables
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"] 