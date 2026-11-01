// src/models/chatHistory.js
const dbConnection = require('../config/database');
const logger = require('../utils/logger');

class ChatHistoryModel {
    static async create(sessionId, message, isBot = false) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            const [result] = await connection.execute(
                'INSERT INTO chat_history (session_id, message, is_bot) VALUES (?, ?, ?)',
                [sessionId, message, isBot]
            );

            return result.insertId;
        } catch (error) {
            logger.error('Error creating chat history record:', error);
            throw error;
        }
    }

    static async getBySessionId(sessionId, limit = 100) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            const [rows] = await connection.execute(
                'SELECT * FROM chat_history WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?',
                [sessionId, limit]
            );

            return rows.reverse(); // Return in chronological order
        } catch (error) {
            logger.error('Error getting chat history:', error);
            throw error;
        }
    }

    static async deleteBySessionId(sessionId) {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            const [result] = await connection.execute(
                'DELETE FROM chat_history WHERE session_id = ?',
                [sessionId]
            );

            return result.affectedRows;
        } catch (error) {
            logger.error('Error deleting chat history:', error);
            throw error;
        }
    }

    static async getStats() {
        try {
            const connection = dbConnection.getConnection();
            if (!connection) {
                throw new Error('Database connection not available');
            }

            const [result] = await connection.execute(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(CASE WHEN is_bot = 1 THEN 1 END) as bot_messages,
          COUNT(CASE WHEN is_bot = 0 THEN 1 END) as user_messages
        FROM chat_history
      `);

            return result[0];
        } catch (error) {
            logger.error('Error getting chat history stats:', error);
            throw error;
        }
    }
}

module.exports = ChatHistoryModel;