// src/config/redis.js - Complete fixed version
const { createClient } = require('redis');
const config = require('./environment');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnecting = false;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnecting || this.isConnected) {
      return this.client;
    }

    this.isConnecting = true;

    try {
      this.client = createClient({
        url: config.redis.url,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
          connectTimeout: 5000
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Disconnected from Redis');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Reconnecting to Redis');
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      await this.client.connect();
      this.isConnecting = false;
      return this.client;
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
        logger.info('Redis client disconnected');
      } catch (error) {
        logger.error('Error disconnecting Redis:', error);
      }
    }
  }

  getClient() {
    return this.client;
  }

  isClientConnected() {
    return this.isConnected && this.client;
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;