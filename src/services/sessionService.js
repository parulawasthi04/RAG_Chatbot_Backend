// src/services/sessionService.js - Complete fixed version
const redisClient = require('../config/redis');
const config = require('../config/environment');
const logger = require('../utils/logger');

class SessionService {
    constructor() {
        this.redis = null; // Initialize as null
    }

    // Helper method to ensure Redis is connected
    async ensureRedisConnection() {
        if (!this.redis) {
            this.redis = redisClient.getClient();
        }
        if (!this.redis) {
            throw new Error('Redis connection not available');
        }
        return this.redis;
    }

    async createSession(sessionId) {
        try {
            const redis = await this.ensureRedisConnection();
            const sessionKey = `session:${sessionId}`;
            const sessionData = {
                id: sessionId,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                messageCount: 0
            };

            await redis.hSet(sessionKey, sessionData);
            await redis.expire(sessionKey, config.redis.sessionTTL);

            logger.info(`Session created: ${sessionId}`);
            return sessionData;
        } catch (error) {
            logger.error('Error creating session:', error);
            throw error;
        }
    }

    async sessionExists(sessionId) {
        try {
            const redis = await this.ensureRedisConnection();
            const sessionKey = `session:${sessionId}`;
            return await redis.exists(sessionKey);
        } catch (error) {
            logger.error('Error checking session existence:', error);
            throw error;
        }
    }

    async updateSessionActivity(sessionId) {
        try {
            const redis = await this.ensureRedisConnection();
            const sessionKey = `session:${sessionId}`;
            await redis.hSet(sessionKey, 'lastActivity', new Date().toISOString());
            await redis.expire(sessionKey, config.redis.sessionTTL);
        } catch (error) {
            logger.error('Error updating session activity:', error);
            throw error;
        }
    }

    async getSession(sessionId) {
        try {
            const redis = await this.ensureRedisConnection();
            const sessionKey = `session:${sessionId}`;
            return await redis.hGetAll(sessionKey);
        } catch (error) {
            logger.error('Error getting session:', error);
            throw error;
        }
    }

    async deleteSession(sessionId) {
        try {
            const redis = await this.ensureRedisConnection();
            const sessionKey = `session:${sessionId}`;
            const chatKey = `chat:${sessionId}`;

            await redis.del(sessionKey);
            await redis.del(chatKey);

            logger.info(`Session deleted: ${sessionId}`);
            return true;
        } catch (error) {
            logger.error('Error deleting session:', error);
            throw error;
        }
    }

    async addMessage(sessionId, message, isBot = false) {
        try {
            const redis = await this.ensureRedisConnection();
            const chatKey = `chat:${sessionId}`;
            const messageData = {
                id: Date.now().toString(),
                content: message,
                isBot,
                timestamp: new Date().toISOString()
            };

            await redis.lPush(chatKey, JSON.stringify(messageData));
            await redis.expire(chatKey, config.redis.chatHistoryTTL);

            // Update session message count
            const sessionKey = `session:${sessionId}`;
            await redis.hIncrBy(sessionKey, 'messageCount', 1);

            return messageData;
        } catch (error) {
            logger.error('Error adding message:', error);
            throw error;
        }
    }

    async getChatHistory(sessionId) {
        try {
            const redis = await this.ensureRedisConnection();
            const chatKey = `chat:${sessionId}`;
            const messages = await redis.lRange(chatKey, 0, -1);

            return messages.map(msg => JSON.parse(msg)).reverse();
        } catch (error) {
            logger.error('Error getting chat history:', error);
            throw error;
        }
    }
}

module.exports = new SessionService();