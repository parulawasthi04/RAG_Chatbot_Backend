// src/routes/sessionRoutes.js
const express = require('express');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/session/current - Get current session info
router.get('/current', async (req, res) => {
    try {
        const sessionId = req.sessionId;
        const sessionData = await sessionService.getSession(sessionId);

        res.json({
            sessionId,
            ...sessionData
        });

    } catch (error) {
        logger.error('Error getting session info:', error);
        res.status(500).json({
            error: 'Failed to get session information'
        });
    }
});

// POST /api/session/reset - Reset current session
router.post('/reset', async (req, res) => {
    try {
        const sessionId = req.sessionId;

        await sessionService.deleteSession(sessionId);
        const newSession = await sessionService.createSession(sessionId);

        res.json({
            message: 'Session reset successfully',
            session: newSession
        });

    } catch (error) {
        logger.error('Error resetting session:', error);
        res.status(500).json({
            error: 'Failed to reset session'
        });
    }
});

module.exports = router;