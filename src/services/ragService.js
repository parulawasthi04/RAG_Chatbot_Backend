// src/services/ragService.js
const embeddingService = require('./embeddingService');
const vectorStoreService = require('./vectorStoreService');
const geminiService = require('./geminiService');
const config = require('../config/environment');
const logger = require('../utils/logger');

class RAGService {
    async processQuery(query, sessionId) {
        try {
            logger.info(`Processing RAG query for session ${sessionId}: ${query}`);

            // Step 1: Generate embedding for the query
            const queryEmbedding = await embeddingService.generateEmbedding(query);

            // Step 2: Search for similar content in vector store
            const similarContent = await vectorStoreService.searchSimilar(
                queryEmbedding,
                config.rag.topKResults
            );

            if (similarContent.length === 0) {
                return "I don't have enough information in my knowledge base to answer your question. Please try asking about recent news topics.";
            }

            // Step 3: Generate response using Gemini with retrieved context
            const response = await geminiService.generateResponse(query, similarContent);

            logger.info(`Generated RAG response for session ${sessionId}`);
            return response;

        } catch (error) {
            logger.error('Error in RAG processing:', error);

            if (error.message.includes('Rate limit')) {
                return "I'm experiencing high demand right now. Please try again in a few moments.";
            }

            return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
        }
    }

    async getSystemStatus() {
        try {
            const status = {
                embedding_service: 'unknown',
                vector_store: 'unknown',
                llm_service: 'unknown'
            };

            // Check embedding service
            try {
                await embeddingService.generateEmbedding('test');
                status.embedding_service = 'healthy';
            } catch (error) {
                status.embedding_service = 'error';
            }

            // Check vector store
            try {
                await vectorStoreService.getCollectionInfo();
                status.vector_store = 'healthy';
            } catch (error) {
                status.vector_store = 'error';
            }

            // Check Gemini service
            try {
                await geminiService.generateResponse('test', [{ title: 'test', content: 'test content' }]);
                status.llm_service = 'healthy';
            } catch (error) {
                status.llm_service = 'error';
            }

            return status;
        } catch (error) {
            logger.error('Error checking system status:', error);
            throw error;
        }
    }
}

module.exports = new RAGService();