const axios = require('axios');
const faker = require('faker');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS) || 1000;

async function generateLoad() {
    try {
        const product = {
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            price: parseFloat(faker.commerce.price())
        };

        await axios.post(`${API_URL}/api/products`, product);
        console.log(`Created product: ${product.name}`);
    } catch (error) {
        console.error('Error generating load:', error.message);
    }
}

// Generate load periodically
setInterval(generateLoad, INTERVAL_MS); 