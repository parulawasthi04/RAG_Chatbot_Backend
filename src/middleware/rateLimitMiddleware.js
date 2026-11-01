// src/middleware / rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const rateLimitMiddleware = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests from this IP, please try again later'
        });
    }
});

module.exports = rateLimitMiddleware;