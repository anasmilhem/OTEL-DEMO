FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./

# Clean install with only production dependencies
RUN npm ci --only=production

COPY . .

FROM node:18-slim

WORKDIR /app

COPY --from=builder /app .

EXPOSE 3000

CMD ["npm", "start"] 