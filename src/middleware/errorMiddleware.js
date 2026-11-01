// src/middleware/errorMiddleware.js
const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    // Default error
    let error = {
        message: 'Internal server error',
        status: 500
    };

    // Validation errors
    if (err.name === 'ValidationError') {
        error.message = err.message;
        error.status = 400;
    }

    // Redis errors
    if (err.code === 'ECONNREFUSED' && err.address === '127.0.0.1') {
        error.message = 'Database connection failed';
        error.status = 503;
    }

    // Rate limit errors
    if (err.status === 429) {
        error.message = 'Too many requests';
        error.status = 429;
    }

    res.status(error.status).json({
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorMiddleware;
