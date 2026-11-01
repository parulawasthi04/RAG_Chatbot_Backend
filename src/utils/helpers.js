// src/utils/helpers.js
const { v4: uuidv4 } = require('uuid');

class Helpers {
    static generateId() {
        return uuidv4();
    }

    static sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.trim().replace(/\s+/g, ' ');
    }

    static truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - 3) + '...';
    }

    static isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    static formatTimestamp(date = new Date()) {
        return date.toISOString();
    }

    static parseTimestamp(timestamp) {
        return new Date(timestamp);
    }

    static calculateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    static extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return 'Unknown';
        }
    }
}

module.exports = Helpers;