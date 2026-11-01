// src/config/qdrant.js
const { QdrantClient } = require('@qdrant/js-client-rest');
const config = require('./environment');
const logger = require('../utils/logger');

class QdrantConnection {
    constructor() {
        this.client = null;
    }

    connect() {
        try {
            const clientConfig = {
                url: config.qdrant.url
            };

            if (config.qdrant.apiKey) {
                clientConfig.apiKey = config.qdrant.apiKey;
            }

            this.client = new QdrantClient(clientConfig);
            logger.info('Connected to Qdrant');
            return this.client;
        } catch (error) {
            logger.error('Failed to connect to Qdrant:', error);
            throw error;
        }
    }

    getClient() {
        if (!this.client) {
            this.connect();
        }
        return this.client;
    }
}

const qdrantConnection = new QdrantConnection();
module.exports = qdrantConnection;