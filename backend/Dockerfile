FROM node:18-slim

WORKDIR /app

# Install SQLite dependencies
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

# Create data directory and SQLite database file with proper permissions
RUN mkdir -p data && \
    touch data/database.sqlite && \
    chmod -R 777 data

EXPOSE 3000

CMD ["npm", "start"] 