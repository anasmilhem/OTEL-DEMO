FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies including dev dependencies for OpenTelemetry
RUN npm install
RUN npm install \
    @opentelemetry/auto-instrumentations-node \
    @opentelemetry/sdk-node \
    @opentelemetry/exporter-trace-otlp-http \
    @opentelemetry/resource-detector-aws

COPY . .

FROM node:18-slim

WORKDIR /app

COPY --from=builder /app .

ENV NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"

EXPOSE 3000

CMD ["npm", "start"] 