// src/models/session.js
const dbConnection = require('../config/database');
const logger = require('../utils/logger');

class SessionModel {
    static async create(sessionId) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            await connection.execute(
                'INSERT INTO sessions (id) VALUES (?) ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP',
                [sessionId]
            );

            return sessionId;
        } catch (error) {
            logger.error('Error creating session:', error);
            throw error;
        }
    }

    static async updateActivity(sessionId) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            await connection.execute(
                'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
                [sessionId]
            );
        } catch (error) {
            logger.error('Error updating session activity:', error);
            throw error;
        }
    }

    static async incrementMessageCount(sessionId) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            await connection.execute(
                'UPDATE sessions SET message_count = message_count + 1 WHERE id = ?',
                [sessionId]
            );
        } catch (error) {
            logger.error('Error incrementing message count:', error);
            throw error;
        }
    }

    static async getById(sessionId) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            const [rows] = await connection.execute(
                'SELECT * FROM sessions WHERE id = ?',
                [sessionId]
            );

            return rows[0] || null;
        } catch (error) {
            logger.error('Error getting session:', error);
            throw error;
        }
    }

    static async deleteById(sessionId) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            const [result] = await connection.execute(
                'DELETE FROM sessions WHERE id = ?',
                [sessionId]
            );

            return result.affectedRows;
        } catch (error) {
            logger.error('Error deleting session:', error);
            throw error;
        }
    }

    static async cleanup(olderThanHours = 24) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            const [result] = await connection.execute(
                'DELETE FROM sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL ? HOUR)',
                [olderThanHours]
            );

            logger.info(`Cleaned up ${result.affectedRows} old sessions`);
            return result.affectedRows;
        } catch (error) {
            logger.error('Error cleaning up sessions:', error);
            throw error;
        }
    }
}

module.exports = SessionModel;
