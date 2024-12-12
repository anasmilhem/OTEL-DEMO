FROM node:18-slim

WORKDIR /app

# Install SQLite dependencies
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

# Create data directory and SQLite database file with proper permissions
RUN mkdir data && touch data/database.sqlite && chmod 777 data data/database.sqlite

EXPOSE 3000

CMD ["npm", "start"] 