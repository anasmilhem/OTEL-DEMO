const mongoose = require('mongoose');
const { logger } = require('./logger');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/productdb', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        logger.info('MongoDB connected successfully', {
            uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/productdb'
        });
    } catch (error) {
        logger.error('MongoDB connection error', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};

module.exports = connectDB; 