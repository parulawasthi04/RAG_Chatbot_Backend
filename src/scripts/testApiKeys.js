// src/scripts/testApiKeys.js - Updated with better error handling
require('dotenv').config();
const embeddingService = require('../services/embeddingService');
const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

async function testApiKeys() {
    logger.info('🔑 Testing API keys...');

    // Test environment variables
    logger.info('\n📋 Environment Variables:');
    logger.info(`JINA_API_KEY: ${process.env.JINA_API_KEY ? '✅ Set (' + process.env.JINA_API_KEY.substring(0, 10) + '...)' : '❌ Not set'}`);
    logger.info(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set (' + process.env.GEMINI_API_KEY.substring(0, 10) + '...)' : '❌ Not set'}`);

    let jinaWorking = false;
    let geminiWorking = false;

    // Test Jina API
    logger.info('\n🧠 Testing Jina Embeddings API...');
    try {
        // First validate API key format
        const jinaValidation = embeddingService.validateApiKey();
        if (!jinaValidation.valid) {
            logger.error(`❌ Jina API key validation failed: ${jinaValidation.error}`);
        } else {
            logger.info('✅ Jina API key format is valid');

            // Test actual API call
            const isConnected = await embeddingService.testConnection();
            jinaWorking = isConnected;
        }
    } catch (error) {
        logger.error('❌ Jina API test failed:', error.message);
    }

    // Test Gemini API
    logger.info('\n🤖 Testing Gemini API...');
    try {
        // First validate API key format
        const geminiValidation = geminiService.validateApiKey();
        if (!geminiValidation.valid) {
            logger.error(`❌ Gemini API key validation failed: ${geminiValidation.error}`);
        } else {
            logger.info('✅ Gemini API key format is valid');

            // Test actual API call
            const isConnected = await geminiService.testConnection();
            geminiWorking = isConnected;
        }
    } catch (error) {
        logger.error('❌ Gemini API test failed:', error.message);
    }

    // Summary
    logger.info('\n📊 Test Results Summary:');
    logger.info(`Jina Embeddings API: ${jinaWorking ? '✅ Working' : '❌ Failed'}`);
    logger.info(`Gemini LLM API: ${geminiWorking ? '✅ Working' : '❌ Failed'}`);

    if (jinaWorking && geminiWorking) {
        logger.info('\n🎉 All APIs are working! You can proceed with data ingestion.');
        logger.info('💡 Next step: Run "npm run ingest-sample"');
    } else {
        logger.info('\n⚠️  Some APIs are not working. Please fix the issues above before proceeding.');

        if (!jinaWorking) {
            logger.info('🔧 To fix Jina API:');
            logger.info('   1. Go to https://jina.ai/embeddings');
            logger.info('   2. Sign up and get your API key');
            logger.info('   3. Add it to .env: JINA_API_KEY=jina_your_key_here');
        }

        if (!geminiWorking) {
            logger.info('🔧 To fix Gemini API:');
            logger.info('   1. Go to https://aistudio.google.com/apikey');
            logger.info('   2. Create a new API key');
            logger.info('   3. Add it to .env: GEMINI_API_KEY=AIza_your_key_here');
        }
    }

    return { jinaWorking, geminiWorking };
}

// Simple API key setup helper
async function setupApiKeys() {
    logger.info('🔧 API Key Setup Helper');
    logger.info('\n📝 Please add these lines to your .env file:');
    logger.info('');
    logger.info('# Get from https://jina.ai/embeddings');
    logger.info('JINA_API_KEY=jina_your_actual_key_here');
    logger.info('');
    logger.info('# Get from https://aistudio.google.com/apikey');
    logger.info('GEMINI_API_KEY=AIza_your_actual_key_here');
    logger.info('');
    logger.info('💡 After adding keys, run: npm run test-apis');
}

// Run if called directly
if (require.main === module) {
    const command = process.argv[2];

    if (command === 'setup') {
        setupApiKeys()
            .then(() => process.exit(0))
            .catch((error) => {
                logger.error('Setup failed:', error);
                process.exit(1);
            });
    } else {
        testApiKeys()
            .then(() => process.exit(0))
            .catch((error) => {
                logger.error('Script failed:', error);
                process.exit(1);
            });
    }
}

module.exports = testApiKeys;