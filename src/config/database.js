// src/config/database.js
const mysql = require('mysql2/promise');
const config = require('./environment');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      logger.info('Connected to MySQL database');
      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MySQL:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
    }
  }

  getConnection() {
    return this.connection;
  }
}

const dbConnection = new DatabaseConnection();
module.exports = dbConnection;