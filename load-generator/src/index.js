const axios = require('axios');
const faker = require('faker');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS) || 10000;

async function getRandomProduct() {
    try {
        const response = await axios.get(`${API_URL}/api/products`);
        const products = response.data.products;
        if (products.length === 0) return null;
        return products[Math.floor(Math.random() * products.length)];
    } catch (error) {
        console.error('Error fetching products:', error.message);
        return null;
    }
}

async function generateLoad() {
    try {
        // 20% chance to create a new product
        if (Math.random() <= 0.2) {
            const product = {
                name: faker.commerce.productName(),
                description: faker.commerce.productDescription(),
                price: parseFloat(faker.commerce.price())
            };

            await axios.post(`${API_URL}/api/products`, product);
            console.log(`Created product: ${product.name}`);
        }

        // 10% chance to delete a random product
        if (Math.random() <= 0.1) {
            const productToDelete = await getRandomProduct();
            if (productToDelete) {
                await axios.delete(`${API_URL}/api/products/${productToDelete._id}`);
                console.log(`Deleted product: ${productToDelete.name}`);
            }
        }
    } catch (error) {
        console.error('Error generating load:', error.message);
    }
}

// Generate load periodically
setInterval(generateLoad, INTERVAL_MS);

// Initial log
console.log('Load generator started with interval:', INTERVAL_MS, 'ms'); 