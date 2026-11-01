// src/services/newsIngestionService.js - Improved with better network handling
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const embeddingService = require('./embeddingService');
const vectorStoreService = require('./vectorStoreService');
const TextProcessor = require('../utils/textProcessor');
const config = require('../config/environment');
const logger = require('../utils/logger');

class NewsIngestionService {
    constructor() {
        this.parser = new Parser({
            timeout: 15000, // Increased timeout
            customFields: {
                item: ['description', 'content:encoded', 'summary']
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // More reliable RSS feeds
        this.rssFeeds = [
            'https://feeds.reuters.com/reuters/topNews',
            'https://rss.cnn.com/rss/edition.rss',
            'https://feeds.bbci.co.uk/news/rss.xml',
            'https://www.wired.com/feed/rss',
            'https://techcrunch.com/feed/',
            'https://www.theguardian.com/international/rss'
        ];
    }

    async ingestFromRSSFeeds(feeds = this.rssFeeds) {
        const allArticles = [];
        let successfulFeeds = 0;

        logger.info(`🚀 Starting RSS ingestion from ${feeds.length} feeds...`);

        for (const [index, feedUrl] of feeds.entries()) {
            try {
                logger.info(`📡 Processing feed ${index + 1}/${feeds.length}: ${feedUrl}`);
                const articles = await this.processRSSFeed(feedUrl);

                if (articles.length > 0) {
                    allArticles.push(...articles);
                    successfulFeeds++;
                    logger.info(`✅ Successfully processed ${articles.length} articles from feed ${index + 1}`);
                } else {
                    logger.warn(`⚠️  No articles found in feed ${index + 1}`);
                }

                // Add delay between feeds to avoid rate limiting
                if (index < feeds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                logger.error(`❌ Error processing feed ${index + 1} (${feedUrl}): ${error.message}`);
                continue;
            }
        }

        logger.info(`📊 Processing complete: ${successfulFeeds}/${feeds.length} feeds successful, ${allArticles.length} total articles`);

        if (allArticles.length === 0) {
            logger.error('❌ No articles were successfully retrieved from any RSS feed');
            throw new Error('Failed to retrieve articles from RSS feeds. Check your internet connection.');
        }

        // Limit to ~50 articles as requested
        const articlesToProcess = allArticles.slice(0, 50);
        logger.info(`📝 Selected ${articlesToProcess.length} articles for processing`);

        if (articlesToProcess.length > 0) {
            await this.storeArticlesInVectorStore(articlesToProcess);
        }

        return articlesToProcess;
    }

    async processRSSFeed(feedUrl) {
        try {
            // Add timeout and retry logic
            let feed;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    feed = await this.parser.parseURL(feedUrl);
                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        throw error;
                    }
                    logger.warn(`⚠️  Retry ${retryCount}/${maxRetries} for ${feedUrl}: ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            if (!feed || !feed.items) {
                throw new Error('Invalid RSS feed structure');
            }

            const articles = [];
            const itemsToProcess = Math.min(feed.items.length, 15); // Limit per feed

            for (let i = 0; i < itemsToProcess; i++) {
                const item = feed.items[i];
                try {
                    const article = await this.extractArticleContent(item);
                    if (article && article.content.length > 100) { // Minimum content length
                        articles.push({
                            ...article,
                            source: this.getSourceName(feedUrl)
                        });
                    }
                } catch (error) {
                    logger.warn(`⚠️  Error processing article "${item.title}": ${error.message}`);
                    continue;
                }
            }

            return articles;
        } catch (error) {
            logger.error(`❌ Error parsing RSS feed ${feedUrl}: ${error.message}`);
            return [];
        }
    }

    async extractArticleContent(rssItem) {
        try {
            let content = '';

            // Try different content fields in order of preference
            if (rssItem['content:encoded']) {
                content = this.stripHtml(rssItem['content:encoded']);
            } else if (rssItem.summary) {
                content = this.stripHtml(rssItem.summary);
            } else if (rssItem.description) {
                content = this.stripHtml(rssItem.description);
            } else if (rssItem.content) {
                content = this.stripHtml(rssItem.content);
            }

            // If content is too short, try to fetch from article URL (with timeout)
            if (content.length < 200 && rssItem.link) {
                try {
                    logger.info(`🔍 Fetching full content for: ${rssItem.title?.substring(0, 50)}...`);
                    const fullContent = await this.scrapeArticleFromURL(rssItem.link);
                    if (fullContent && fullContent.length > content.length) {
                        content = fullContent;
                    }
                } catch (error) {
                    logger.warn(`⚠️  Could not fetch full content for ${rssItem.link}: ${error.message}`);
                }
            }

            // Ensure we have minimum viable content
            if (content.length < 50) {
                throw new Error('Content too short after processing');
            }

            return {
                title: rssItem.title || 'Untitled Article',
                content: TextProcessor.cleanText(content),
                url: rssItem.link || '',
                publishedAt: rssItem.pubDate || rssItem.isoDate || new Date().toISOString()
            };
        } catch (error) {
            logger.error('❌ Error extracting article content:', error.message);
            return null;
        }
    }

    async scrapeArticleFromURL(url) {
        try {
            const response = await axios.get(url, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                maxRedirects: 3
            });

            const $ = cheerio.load(response.data);

            // Remove unwanted elements
            $('script, style, nav, header, footer, aside, .advertisement, .ad, .social-share').remove();

            // Try multiple selectors for article content
            let content = '';
            const selectors = [
                'article p',
                '[class*="content"] p',
                '[class*="article"] p',
                '[class*="story"] p',
                '.entry-content p',
                'main p',
                '.post-content p',
                '[data-module="ArticleBody"] p'
            ];

            for (const selector of selectors) {
                const paragraphs = $(selector);
                if (paragraphs.length >= 3) { // Need at least 3 paragraphs
                    content = paragraphs.map((i, el) => $(el).text().trim()).get()
                        .filter(text => text.length > 20) // Filter short paragraphs
                        .join(' ');
                    if (content.length > 200) {
                        break;
                    }
                }
            }

            return content.length > 200 ? content : '';
        } catch (error) {
            logger.warn(`⚠️  Error scraping ${url}: ${error.message}`);
            return '';
        }
    }

    stripHtml(html) {
        if (!html) return '';
        return cheerio.load(html).text()
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .trim();
    }

    getSourceName(feedUrl) {
        if (feedUrl.includes('reuters')) return 'Reuters';
        if (feedUrl.includes('cnn')) return 'CNN';
        if (feedUrl.includes('bbc')) return 'BBC';
        if (feedUrl.includes('wired')) return 'Wired';
        if (feedUrl.includes('techcrunch')) return 'TechCrunch';
        if (feedUrl.includes('guardian')) return 'The Guardian';
        return 'Unknown Source';
    }

    async storeArticlesInVectorStore(articles) {
        try {
            const articlesToStore = [];

            logger.info(`🔄 Processing ${articles.length} articles for embedding generation...`);

            for (const [index, article] of articles.entries()) {
                // Chunk large articles
                const chunks = TextProcessor.chunkText(
                    article.content,
                    config.rag.chunkSize,
                    config.rag.chunkOverlap
                );

                for (let i = 0; i < chunks.length; i++) {
                    articlesToStore.push({
                        title: article.title + (chunks.length > 1 ? ` (Part ${i + 1})` : ''),
                        content: chunks[i],
                        url: article.url,
                        publishedAt: article.publishedAt,
                        source: article.source
                    });
                }

                if ((index + 1) % 10 === 0) {
                    logger.info(`📊 Processed ${index + 1}/${articles.length} articles for chunking`);
                }
            }

            logger.info(`📝 Generated ${articlesToStore.length} chunks from ${articles.length} articles`);

            // Generate embeddings in batches
            const batchSize = 5; // Smaller batches for stability
            const embeddedArticles = [];

            for (let i = 0; i < articlesToStore.length; i += batchSize) {
                const batch = articlesToStore.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(articlesToStore.length / batchSize);

                try {
                    logger.info(`🔄 Processing embedding batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`);

                    const texts = batch.map(article => article.content);
                    const embeddings = await embeddingService.generateBatchEmbeddings(texts);

                    batch.forEach((article, index) => {
                        embeddedArticles.push({
                            ...article,
                            embedding: embeddings[index],
                            id: Date.now() + i + index
                        });
                    });

                    logger.info(`✅ Completed batch ${batchNumber}/${totalBatches}`);

                    // Add delay between batches to respect rate limits
                    if (i + batchSize < articlesToStore.length) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    logger.error(`❌ Error processing batch ${batchNumber}: ${error.message}`);
                    continue;
                }
            }

            if (embeddedArticles.length > 0) {
                await vectorStoreService.storeEmbeddings(embeddedArticles);
                logger.info(`🎉 Successfully stored ${embeddedArticles.length} article chunks in vector store`);
            } else {
                throw new Error('No articles were successfully processed for embedding');
            }

            return embeddedArticles.length;
        } catch (error) {
            logger.error('❌ Error storing articles in vector store:', error);
            throw error;
        }
    }

    async getIngestionStats() {
        try {
            const collectionInfo = await vectorStoreService.getCollectionInfo();
            return {
                totalDocuments: collectionInfo.points_count || 0,
                lastIngestion: new Date().toISOString()
            };
        } catch (error) {
            logger.error('❌ Error getting ingestion stats:', error);
            return { totalDocuments: 0, lastIngestion: null };
        }
    }
}

module.exports = new NewsIngestionService();