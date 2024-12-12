const axios = require('axios');
const faker = require('faker');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const INTERVAL_MS = process.env.INTERVAL_MS || 1000;

async function generateLoad() {
    try {
        // Random operation selection
        const operations = ['GET', 'POST'];
        const operation = operations[Math.floor(Math.random() * operations.length)];

        if (operation === 'GET') {
            await axios.get(`${API_URL}/api/products`);
            console.log('GET request completed');
        } else {
            const product = {
                name: faker.commerce.productName(),
                description: faker.commerce.productDescription(),
                price: parseFloat(faker.commerce.price()),
            };
            await axios.post(`${API_URL}/api/products`, product);
            console.log('POST request completed');
        }
    } catch (error) {
        console.error('Error generating load:', error.message);
    }
}

// Run continuously
setInterval(generateLoad, INTERVAL_MS);
console.log('Load generator started'); 