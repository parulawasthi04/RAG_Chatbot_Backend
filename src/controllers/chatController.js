// src/controllers/chatController.js
const { v4: uuidv4 } = require('uuid');
const ragService = require('../services/ragService');
const redisConfig = require('../config/redis');
const logger = require('../utils/logger');

class ChatController {
    constructor() {
        this.redis = null;
    }

    async initialize() {
        this.redis = await redisConfig.connect();
    }

    async sendMessage(req, res) {
        try {
            const { message, sessionId } = req.body;

            if (!message || !sessionId) {
                return res.status(400).json({
                    error: 'Message and sessionId are required'
                });
            }

            // Get session history
            const sessionHistory = await this.getSessionHistory(sessionId);

            // Process query with RAG
            const ragResponse = await ragService.processQuery(message);

            // Create response object
            const response = {
                id: uuidv4(),
                message: ragResponse.response,
                sources: ragResponse.sources,
                timestamp: new Date().toISOString(),
                type: 'assistant'
            };

            // Create user message object
            const userMessage = {
                id: uuidv4(),
                message: message,
                timestamp: new Date().toISOString(),
                type: 'user'
            };

            // Update session history
            await this.updateSessionHistory(sessionId, [userMessage, response]);

            res.json({
                response: response.message,
                sources: response.sources,
                messageId: response.id,
                sessionId
            });

        } catch (error) {
            logger.error('Error in sendMessage:', error);
            res.status(500).json({
                error: 'Failed to process message'
            });
        }
    }

    async getSessionHistory(sessionId) {
        try {
            const historyKey = `session:${sessionId}:history`;
            const history = await this.redis.get(historyKey);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            logger.error('Error getting session history:', error);
            return [];
        }
    }

    async updateSessionHistory(sessionId, newMessages) {
        try {
            const historyKey = `session:${sessionId}:history`;
            const existingHistory = await this.getSessionHistory(sessionId);

            const updatedHistory = [...existingHistory, ...newMessages];

            // Keep only last 100 messages to prevent memory issues
            const trimmedHistory = updatedHistory.slice(-100);

            await this.redis.setex(
                historyKey,
                parseInt(process.env.SESSION_TTL) || 3600,
                JSON.stringify(trimmedHistory)
            );
        } catch (error) {
            logger.error('Error updating session history:', error);
        }
    }

    async streamMessage(req, res) {
        try {
            const { message, sessionId } = req.body;

            if (!message || !sessionId) {
                return res.status(400).json({
                    error: 'Message and sessionId are required'
                });
            }

            // Set up Server-Sent Events
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });

            // Send initial event
            res.write(`data: ${JSON.stringify({ type: 'start', message: 'Processing your query...' })}\n\n`);

            try {
                // Process with RAG
                const ragResponse = await ragService.processQuery(message);

                // Stream the response word by word
                const words = ragResponse.response.split(' ');
                let streamedText = '';

                for (let i = 0; i < words.length; i++) {
                    streamedText += (i > 0 ? ' ' : '') + words[i];

                    res.write(`data: ${JSON.stringify({
                        type: 'chunk',
                        text: streamedText,
                        isComplete: i === words.length - 1
                    })}\n\n`);

                    // Add small delay for typing effect
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                // Send completion event
                res.write(`data: ${JSON.stringify({
                    type: 'complete',
                    sources: ragResponse.sources,
                    messageId: uuidv4(),
                    sessionId
                })}\n\n`);

                // Update session history
                const userMessage = {
                    id: uuidv4(),
                    message: message,
                    timestamp: new Date().toISOString(),
                    type: 'user'
                };

                const assistantMessage = {
                    id: uuidv4(),
                    message: ragResponse.response,
                    timestamp: new Date().toISOString(),
                    type: 'assistant',
                    sources: ragResponse.sources
                };

                await this.updateSessionHistory(sessionId, [userMessage, assistantMessage]);

            } catch (error) {
                res.write(`data: ${JSON.stringify({
                    type: 'error',
                    message: 'Failed to process your message'
                })}\n\n`);
            }

            res.write(`data: [DONE]\n\n`);
            res.end();

        } catch (error) {
            logger.error('Error in streamMessage:', error);
            res.status(500).json({ error: 'Failed to stream message' });
        }
    }
}

module.exports = new ChatController();