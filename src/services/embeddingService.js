// src/services/embeddingService.js - Updated for Jina v3 API
require('dotenv').config();
const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');

class EmbeddingService {
    constructor() {
        this.apiKey = process.env.JINA_API_KEY || config.apis.jina.apiKey;
        this.baseURL = 'https://api.jina.ai/v1/embeddings';
        this.model = 'jina-embeddings-v3'; // Updated to v3
    }

    async generateEmbedding(text) {
        try {
            if (!this.apiKey) {
                throw new Error('Jina API key not configured. Please set JINA_API_KEY in your .env file');
            }

            // Clean and validate text input
            const cleanText = this.cleanText(text);
            if (!cleanText || cleanText.length < 1) {
                throw new Error('Text input is empty or invalid');
            }

            logger.info(`Generating embedding for text (${cleanText.length} chars)`);

            const requestData = {
                model: this.model,
                task: 'text-matching', // Added task parameter as shown in Jina example
                input: [cleanText]
            };

            const response = await axios.post(
                this.baseURL,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: 15000
                }
            );

            if (!response.data || !response.data.data || !response.data.data[0]) {
                throw new Error('Invalid response format from Jina API');
            }

            return response.data.data[0].embedding;
        } catch (error) {
            this.logDetailedError('generateEmbedding', error);

            if (error.response?.status === 422) {
                throw new Error('Invalid request to Jina API. Please check your API key and input text.');
            } else if (error.response?.status === 401) {
                throw new Error('Invalid Jina API key. Please check your JINA_API_KEY in .env file.');
            } else if (error.response?.status === 429) {
                throw new Error('Jina API rate limit exceeded. Please try again later.');
            }

            throw new Error(`Embedding generation failed: ${error.message}`);
        }
    }

    async generateBatchEmbeddings(texts) {
        try {
            if (!this.apiKey) {
                throw new Error('Jina API key not configured. Please set JINA_API_KEY in your .env file');
            }

            if (!texts || !Array.isArray(texts) || texts.length === 0) {
                throw new Error('Invalid texts input - must be non-empty array');
            }

            // Clean all texts and filter out empty ones
            const cleanTexts = texts
                .map(text => this.cleanText(text))
                .filter(text => text && text.length > 0);

            if (cleanTexts.length === 0) {
                throw new Error('No valid texts after cleaning');
            }

            logger.info(`Generating batch embeddings for ${cleanTexts.length} texts`);

            const requestData = {
                model: this.model,
                task: 'text-matching', // Added task parameter
                input: cleanTexts
            };

            const response = await axios.post(
                this.baseURL,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: 30000
                }
            );

            if (!response.data || !response.data.data) {
                throw new Error('Invalid response format from Jina API');
            }

            return response.data.data.map(item => item.embedding);
        } catch (error) {
            this.logDetailedError('generateBatchEmbeddings', error);

            if (error.response?.status === 422) {
                throw new Error('Invalid request to Jina API. Check your input texts and API key format.');
            } else if (error.response?.status === 401) {
                throw new Error('Invalid Jina API key. Please verify your JINA_API_KEY in .env file.');
            } else if (error.response?.status === 429) {
                throw new Error('Jina API rate limit exceeded. Please try again later.');
            }

            throw new Error(`Batch embedding generation failed: ${error.message}`);
        }
    }

    // Helper method to clean text input
    cleanText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            .trim()
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
            .slice(0, 8192);  // Limit to 8192 characters (Jina's limit)
    }

    // Enhanced error logging
    logDetailedError(method, error) {
        const errorDetails = {
            method,
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            responseData: error.response?.data,
            requestConfig: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers ? { ...error.config.headers, Authorization: '[REDACTED]' } : undefined
            }
        };

        logger.error('Detailed Jina API error:', errorDetails);
    }

    // Test API connection with the exact format from Jina's example
    async testConnection() {
        try {
            logger.info('🧪 Testing Jina API connection...');

            const testData = {
                model: this.model,
                task: 'text-matching',
                input: [
                    'This is a test message to verify the Jina API connection is working properly.'
                ]
            };

            const response = await axios.post(
                this.baseURL,
                testData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: 10000
                }
            );

            if (response.data && response.data.data && response.data.data[0]) {
                const embedding = response.data.data[0].embedding;
                logger.info(`✅ Jina API connection test successful! Generated embedding with ${embedding.length} dimensions`);
                logger.info(`📊 Model: ${response.data.model || 'unknown'}`);
                logger.info(`⚡ Usage: ${JSON.stringify(response.data.usage || {})}`);
                return true;
            } else {
                logger.error('❌ Invalid response format from Jina API');
                return false;
            }
        } catch (error) {
            this.logDetailedError('testConnection', error);
            logger.error('❌ Jina API connection test failed:', error.message);
            return false;
        }
    }

    // Validate API key format
    validateApiKey() {
        if (!this.apiKey) {
            return { valid: false, error: 'API key not set in environment variables' };
        }

        if (!this.apiKey.startsWith('jina_')) {
            return { valid: false, error: 'API key should start with "jina_"' };
        }

        if (this.apiKey.length < 20) {
            return { valid: false, error: 'API key appears to be too short' };
        }

        return { valid: true };
    }
}

module.exports = new EmbeddingService();