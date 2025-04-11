const { logger } = require('./config/logger');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const initializeDb = require('./config/initDb');
const productRoutes = require('./routes/product');
const {
    activeUsers,
    httpRequestDuration,
    dbOperationDuration,
    apiEndpointCounter,
    errorCounter
} = require('./instrumentation');

const app = express();
const PORT = process.env.PORT || 3000;

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    errorCounter.add(1, { error_type: 'uncaught_exception' });
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

// Middleware for metrics
app.use((req, res, next) => {
    const start = Date.now();

    // Log metric recording
    logger.info('API hit metric recorded', {
        method: req.method,
        route: req.path,
        metric_type: 'api_hit'
    });

    apiEndpointCounter.add(1, {
        method: req.method,
        route: req.path
    });

    // Track active users (simplified example using session)
    if (req.headers['user-session']) {
        activeUsers.add(1);
    }

    // Track response time
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request duration metric recorded', {
            method: req.method,
            route: req.path,
            duration,
            statusCode: res.statusCode,
            metric_type: 'request_duration'
        });

        httpRequestDuration.record(duration, {
            method: req.method,
            route: req.path,
            status_code: res.statusCode
        });

        if (res.statusCode >= 400) {
            errorCounter.add(1, {
                error_type: 'http_error',
                status_code: res.statusCode
            });
        }
    });

    res.on('close', () => {
        if (req.headers['user-session']) {
            activeUsers.add(-1);
        }
    });

    next();
});

// Middleware for logging
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
    allowedHeaders: ['Content-Type', 'Authorization', 'user-session'],
    credentials: true
}));

// Database operation wrapper for metrics
const wrapDbOperation = async (operation, operationType) => {
    const start = Date.now();
    try {
        const result = await operation();
        const duration = Date.now() - start;
        dbOperationDuration.record(duration, {
            operation_type: operationType
        });
        return result;
    } catch (error) {
        errorCounter.add(1, {
            error_type: 'database_error',
            operation: operationType
        });
        throw error;
    }
};

// Routes
app.use('/api/products', productRoutes);

// Health check endpoint with metrics
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Server startup
const startup = async () => {
    try {
        await wrapDbOperation(connectDB, 'connect');
        await wrapDbOperation(initializeDb, 'initialize');

        app.listen(PORT, () => {
            logger.info('Application started successfully', {
                port: PORT,
                environment: process.env.NODE_ENV || 'development'
            });
        });
    } catch (error) {
        errorCounter.add(1, { error_type: 'startup_error' });
        logger.error('Application startup failed', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};

startup().catch((error) => {
    errorCounter.add(1, { error_type: 'startup_error' });
    logger.error('Failed to start application', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
}); 