// src/scripts/setupDatabase.js
const mysql = require('mysql2/promise');
const config = require('../config/environment');
const logger = require('../utils/logger');

async function setupDatabase() {
    let connection;

    try {
        // Connect without specifying database first
        connection = await mysql.createConnection({
            host: config.mysql.host,
            port: config.mysql.port,
            user: config.mysql.user,
            password: config.mysql.password
        });

        // Create database if it doesn't exist
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.mysql.database}`);
        logger.info(`Database ${config.mysql.database} created or already exists`);

        // Switch to the database
        await connection.execute(`USE ${config.mysql.database}`);

        // Create chat_history table
        const createChatHistoryTable = `
      CREATE TABLE IF NOT EXISTS chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        message TEXT NOT NULL,
        is_bot BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_id (session_id),
        INDEX idx_timestamp (timestamp)
      )
    `;

        await connection.execute(createChatHistoryTable);
        logger.info('chat_history table created or already exists');

        // Create sessions table
        const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        message_count INT DEFAULT 0,
        INDEX idx_last_activity (last_activity)
      )
    `;

        await connection.execute(createSessionsTable);
        logger.info('sessions table created or already exists');

        // Create news_articles table (optional, for storing original articles)
        const createNewsTable = `
      CREATE TABLE IF NOT EXISTS news_articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content LONGTEXT NOT NULL,
        url VARCHAR(1000),
        published_at TIMESTAMP,
        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_published_at (published_at),
        INDEX idx_ingested_at (ingested_at)
      )
    `;

        await connection.execute(createNewsTable);
        logger.info('news_articles table created or already exists');

        logger.info('Database setup completed successfully');

    } catch (error) {
        logger.error('Database setup failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;