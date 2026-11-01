// src/utils/textProcessor.js
class TextProcessor {
    static chunkText(text, chunkSize = 500, overlap = 50) {
        const chunks = [];
        const words = text.split(' ');

        for (let i = 0; i < words.length; i += chunkSize - overlap) {
            const chunk = words.slice(i, i + chunkSize).join(' ');
            if (chunk.trim().length > 0) {
                chunks.push(chunk.trim());
            }
        }

        return chunks;
    }

    static cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .replace(/[^\w\s.,!?-]/g, '')
            .trim();
    }

    static extractMetadata(content) {
        const lines = content.split('\n');
        const title = lines[0]?.trim() || 'Untitled';
        const wordCount = content.split(' ').length;

        return {
            title,
            wordCount,
            estimatedReadTime: Math.ceil(wordCount / 200)
        };
    }
}

module.exports = TextProcessor;
