const { logger } = require('./config/logger');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const initializeDb = require('./config/initDb');
const productRoutes = require('./routes/product');

const app = express();
const PORT = process.env.PORT || 3000;

// Add logging middleware
app.use((req, res, next) => {
    logger.info('Incoming request', {
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent']
    });
    next();
});

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Connect to MongoDB and initialize data
const startup = async () => {
    try {
        await connectDB();
        await initializeDb();
        logger.info('Application started successfully', {
            port: PORT,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        logger.error('Application startup failed', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};
startup();

// Routes
app.use('/api/products', productRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 