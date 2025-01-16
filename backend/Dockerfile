FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

COPY . .

FROM node:18-slim

WORKDIR /app

COPY --from=builder /app .

EXPOSE 3000

CMD ["npm", "start"] 