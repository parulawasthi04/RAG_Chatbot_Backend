const { v4: uuidv4 } = require('uuid');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');

const sessionMiddleware = async (req, res, next) => {
    try {
        // Skip session middleware for health checks
        if (req.path.startsWith('/api/health')) {
            return next();
        }

        // Get session ID from header or create new one
        let sessionId = req.headers['x-session-id'];

        if (!sessionId) {
            sessionId = uuidv4();
            logger.info(`Created new session: ${sessionId}`);
        }

        try {
            // Validate session exists or create it
            const sessionExists = await sessionService.sessionExists(sessionId);
            if (!sessionExists) {
                await sessionService.createSession(sessionId);
                logger.info(`Initialized session: ${sessionId}`);
            } else {
                // Update session activity
                await sessionService.updateSessionActivity(sessionId);
            }
        } catch (error) {
            logger.error('Session service error:', error.message);
            logger.warn('Continuing without session persistence');
        }

        // Add session ID to request
        req.sessionId = sessionId;

        // Add session ID to response header
        res.setHeader('x-session-id', sessionId);

        next();
    } catch (error) {
        logger.error('Session middleware error:', error);
        // Don't fail the request if session management fails
        req.sessionId = uuidv4();
        res.setHeader('x-session-id', req.sessionId);
        next();
    }
};

module.exports = sessionMiddleware;