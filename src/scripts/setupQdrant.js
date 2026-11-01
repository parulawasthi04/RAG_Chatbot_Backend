// src/scripts/setupQdrant.js
const qdrantConnection = require('../config/qdrant');
const vectorStoreService = require('../services/vectorStoreService');
const logger = require('../utils/logger');

async function setupQdrant() {
    try {
        logger.info('Setting up Qdrant collection...');

        await vectorStoreService.initializeCollection();

        const collectionInfo = await vectorStoreService.getCollectionInfo();
        logger.info('Collection info:', collectionInfo);

        logger.info('Qdrant setup completed successfully');

    } catch (error) {
        logger.error('Qdrant setup failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    setupQdrant();
}

module.exports = setupQdrant;