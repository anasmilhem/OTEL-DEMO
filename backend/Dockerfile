FROM node:18-slim

WORKDIR /app

# Install SQLite dependencies
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

# Create an empty SQLite database file with proper permissions
RUN touch database.sqlite && chmod 666 database.sqlite

EXPOSE 3000

CMD ["npm", "start"] 