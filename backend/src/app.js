const { logger } = require('./config/logger');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const initializeDb = require('./config/initDb');
const productRoutes = require('./routes/product');

const app = express();
const PORT = process.env.PORT || 3000;

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    logger.info('Incoming request', {
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent']
    });
    next();
});

// CORS configuration
app.use((req, res, next) => {
    logger.info('Incoming request details', {
        origin: req.headers.origin,
        method: req.method,
        path: req.path,
        headers: req.headers
    });
    next();
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Routes
app.use('/api/products', productRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Server startup
const startup = async () => {
    try {
        await connectDB();
        await initializeDb();

        app.listen(PORT, () => {
            logger.info('Application started successfully', {
                port: PORT,
                environment: process.env.NODE_ENV || 'development'
            });
        });
    } catch (error) {
        logger.error('Application startup failed', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};

startup().catch((error) => {
    logger.error('Failed to start application', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
}); 