// src/routes/healthRoutes.js
const express = require('express');
const ragService = require('../services/ragService');
const newsIngestionService = require('../services/newsIngestionService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/health - Basic health check
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// GET /api/health/detailed - Detailed system health
router.get('/detailed', async (req, res) => {
    try {
        const systemStatus = await ragService.getSystemStatus();
        const ingestionStats = await newsIngestionService.getIngestionStats();

        const overallHealth = Object.values(systemStatus).every(status =>
            status === 'healthy'
        ) ? 'healthy' : 'degraded';

        res.json({
            status: overallHealth,
            timestamp: new Date().toISOString(),
            services: systemStatus,
            ingestion: ingestionStats,
            uptime: process.uptime()
        });

    } catch (error) {
        logger.error('Error in detailed health check:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;