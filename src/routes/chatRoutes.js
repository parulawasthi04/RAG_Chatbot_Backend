// src/routes/chatRoutes.js
const express = require('express');
const ragService = require('../services/ragService');
const sessionService = require('../services/sessionService');
const { validate, schemas } = require('../utils/validators');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/chat/message - Send a message and get response
router.post('/message', validate(schemas.chatMessage), async (req, res) => {
    try {
        const { message } = req.body;
        const sessionId = req.sessionId;

        // Store user message
        await sessionService.addMessage(sessionId, message, false);

        // Process query through RAG pipeline
        const botResponse = await ragService.processQuery(message, sessionId);

        // Store bot response
        await sessionService.addMessage(sessionId, botResponse, true);

        res.json({
            message: botResponse,
            sessionId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error in chat message endpoint:', error);
        res.status(500).json({
            error: 'Failed to process message',
            message: 'I apologize, but I encountered an error processing your request.'
        });
    }
});

// GET /api/chat/history/:sessionId - Get chat history for session
router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const history = await sessionService.getChatHistory(sessionId);

        res.json({
            sessionId,
            messages: history,
            count: history.length
        });

    } catch (error) {
        logger.error('Error getting chat history:', error);
        res.status(500).json({
            error: 'Failed to retrieve chat history'
        });
    }
});

// DELETE /api/chat/session/:sessionId - Clear chat history
router.delete('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        await sessionService.deleteSession(sessionId);

        res.json({
            message: 'Session cleared successfully',
            sessionId
        });

    } catch (error) {
        logger.error('Error clearing session:', error);
        res.status(500).json({
            error: 'Failed to clear session'
        });
    }
});

module.exports = router;