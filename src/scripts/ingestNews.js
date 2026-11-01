// src/scripts/ingestNews.js
require('dotenv').config();
const newsIngestionService = require('../services/newsIngestionService');
const vectorStoreService = require('../services/vectorStoreService');
const logger = require('../utils/logger');

async function ingestNews() {
    try {
        logger.info('Starting news ingestion process...');

        // Initialize Qdrant collection first
        await vectorStoreService.initializeCollection();

        // Ingest from RSS feeds
        const articles = await newsIngestionService.ingestFromRSSFeeds();

        logger.info(`News ingestion completed. Processed ${articles.length} articles.`);

        // Get final stats
        const stats = await newsIngestionService.getIngestionStats();
        logger.info('Final stats:', stats);

    } catch (error) {
        logger.error('News ingestion failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    ingestNews();
}

module.exports = ingestNews;