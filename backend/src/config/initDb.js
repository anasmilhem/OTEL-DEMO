const Product = require('../models/product');

const initialProducts = [
    {
        name: "MacBook Pro",
        description: "13-inch, M2 chip, 8GB RAM, 256GB SSD",
        price: 1299.99
    },
    {
        name: "iPhone 15 Pro",
        description: "256GB, Space Black, 5G Enabled",
        price: 999.99
    },
    {
        name: "iPad Air",
        description: "10.9-inch, M1 chip, Wi-Fi, 64GB",
        price: 599.99
    },
    {
        name: "AirPods Pro",
        description: "2nd Generation, Active Noise Cancellation",
        price: 249.99
    }
];

const initializeDb = async () => {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            await Product.insertMany(initialProducts);
            console.log('Database initialized with default products');
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

module.exports = initializeDb; 