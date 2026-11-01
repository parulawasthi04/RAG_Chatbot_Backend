// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./utils/logger');
const errorMiddleware = require('./middleware/errorMiddleware');
const sessionMiddleware = require('./middleware/sessionMiddleware');
const rateLimitMiddleware = require('./middleware/rateLimitMiddleware');

// Initialize connections
const redisClient = require('./config/redis');
const dbConnection = require('./config/database');

// Routes
const chatRoutes = require('./routes/chatRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL,
        'https://rag-chatbot-news.netlify.app',
        'http://localhost:3000' // Keep for development
    ],
    credentials: true
}));
app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimitMiddleware);

// Session management
app.use(sessionMiddleware);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/session', sessionRoutes);

// Error handling
app.use(errorMiddleware);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize connections and start server
async function startServer() {
    try {
        // Connect to Redis
        await redisClient.connect();

        // Connect to MySQL (optional)
        try {
            await dbConnection.connect();
        } catch (error) {
            logger.warn('MySQL connection failed, continuing without persistent storage');
        }

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await redisClient.disconnect();
    await dbConnection.disconnect();
    process.exit(0);
});

module.exports = app;