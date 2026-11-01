// src/controllers/sessionController.js
class SessionController {
    constructor() {
        this.redis = null;
    }

    async initialize() {
        this.redis = await redisConfig.connect();
    }

    async createSession(req, res) {
        try {
            const sessionId = uuidv4();
            const sessionKey = `session:${sessionId}:info`;

            const sessionInfo = {
                id: sessionId,
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString()
            };

            await this.redis.setex(
                sessionKey,
                parseInt(process.env.SESSION_TTL) || 3600,
                JSON.stringify(sessionInfo)
            );

            res.json({ sessionId });
        } catch (error) {
            logger.error('Error creating session:', error);
            res.status(500).json({ error: 'Failed to create session' });
        }
    }

    async getSessionHistory(req, res) {
        try {
            const { sessionId } = req.params;

            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID is required' });
            }

            const historyKey = `session:${sessionId}:history`;
            const history = await this.redis.get(historyKey);

            res.json({
                sessionId,
                history: history ? JSON.parse(history) : []
            });
        } catch (error) {
            logger.error('Error getting session history:', error);
            res.status(500).json({ error: 'Failed to get session history' });
        }
    }

    async clearSession(req, res) {
        try {
            const { sessionId } = req.params;

            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID is required' });
            }

            const historyKey = `session:${sessionId}:history`;
            const sessionKey = `session:${sessionId}:info`;

            await this.redis.del(historyKey);
            await this.redis.del(sessionKey);

            res.json({
                message: 'Session cleared successfully',
                sessionId
            });
        } catch (error) {
            logger.error('Error clearing session:', error);
            res.status(500).json({ error: 'Failed to clear session' });
        }
    }

    async getSessionInfo(req, res) {
        try {
            const { sessionId } = req.params;

            const sessionKey = `session:${sessionId}:info`;
            const sessionInfo = await this.redis.get(sessionKey);

            if (!sessionInfo) {
                return res.status(404).json({ error: 'Session not found' });
            }

            res.json({
                sessionInfo: JSON.parse(sessionInfo)
            });
        } catch (error) {
            logger.error('Error getting session info:', error);
            res.status(500).json({ error: 'Failed to get session info' });
        }
    }
}

module.exports = new SessionController();