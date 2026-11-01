// src/config/environment.js - Updated for Jina v3
require('dotenv').config();
const config = {
    node_env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,

    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        sessionTTL: parseInt(process.env.REDIS_SESSION_TTL) || 3600,
        chatHistoryTTL: parseInt(process.env.REDIS_CHAT_TTL) || 86400
    },

    mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT) || 3306,
        database: process.env.MYSQL_DATABASE || 'rag_chatbot',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'password'
    },

    qdrant: {
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || null,
        collection: 'news_articles'
    },

    apis: {
        jina: {
            apiKey: process.env.JINA_API_KEY,
            baseURL: 'https://api.jina.ai/v1/embeddings',
            model: 'jina-embeddings-v3', // Updated to v3
            task: 'text-matching' // Added task parameter
        },
        gemini: {
            apiKey: process.env.GEMINI_API_KEY,
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
        }
    },

    rag: {
        chunkSize: parseInt(process.env.CHUNK_SIZE) || 500,
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 50,
        topKResults: parseInt(process.env.TOP_K_RESULTS) || 5
    },

    news: {
        rssFeeds: [
            'https://feeds.reuters.com/reuters/topNews',
            'https://rss.cnn.com/rss/edition.rss',
            'https://feeds.bbci.co.uk/news/rss.xml'
        ]
    }
};

module.exports = config;