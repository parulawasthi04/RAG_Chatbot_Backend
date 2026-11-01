// src/services/guardianNewsService.js - Scrape from The Guardian (all news types)
const axios = require('axios');
const cheerio = require('cheerio');
const embeddingService = require('./embeddingService');
const vectorStoreService = require('./vectorStoreService');
const TextProcessor = require('../utils/textProcessor');
const config = require('../config/environment');
const logger = require('../utils/logger');

class GuardianNewsService {
    constructor() {
        this.baseUrl = 'https://www.theguardian.com';

        // Different news sections to scrape
        this.newsSections = [
            { name: 'Technology', url: '/technology', limit: 8 },
            { name: 'World News', url: '/world', limit: 8 },
            { name: 'Business', url: '/business', limit: 6 },
            { name: 'Science', url: '/science', limit: 6 },
            { name: 'Environment', url: '/environment', limit: 6 },
            { name: 'Health', url: '/society/health', limit: 4 },
            { name: 'Politics', url: '/politics', limit: 6 },
            { name: 'Culture', url: '/culture', limit: 4 }
        ];
    }

    async ingestFromGuardian() {
        const allArticles = [];

        logger.info('Starting Guardian news scraping...');

        for (const section of this.newsSections) {
            try {
                logger.info(`Scraping ${section.name} section...`);
                const articles = await this.scrapeSectionArticles(section);

                if (articles.length > 0) {
                    allArticles.push(...articles);
                    logger.info(`Successfully scraped ${articles.length} articles from ${section.name}`);
                }

                // Delay between sections to be respectful
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                logger.error(`Error scraping ${section.name}: ${error.message}`);
                continue;
            }
        }

        logger.info(`Total articles scraped: ${allArticles.length}`);

        if (allArticles.length === 0) {
            throw new Error('No articles could be scraped from The Guardian. Check network connectivity.');
        }

        // Process and store articles
        await this.storeArticlesInVectorStore(allArticles);
        return allArticles;
    }

    async scrapeSectionArticles(section) {
        try {
            const sectionUrl = this.baseUrl + section.url;

            const response = await axios.get(sectionUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            });

            const $ = cheerio.load(response.data);
            const articles = [];

            // Guardian article selectors
            const articleSelectors = [
                'a[data-link-name="article"]',
                '.fc-item__link',
                '[data-component="GuCardDefault"] a',
                '.u-faux-block-link__overlay'
            ];

            const articleLinks = new Set(); // Use Set to avoid duplicates

            // Try different selectors to find article links
            for (const selector of articleSelectors) {
                $(selector).each((i, element) => {
                    let href = $(element).attr('href');
                    if (href && href.startsWith('/') && !href.includes('#') && !href.includes('video')) {
                        const fullUrl = this.baseUrl + href;
                        const title = $(element).text().trim() ||
                            $(element).find('h3').text().trim() ||
                            $(element).attr('aria-label') ||
                            $(element).closest('article').find('h3').text().trim();

                        if (title && title.length > 20 && articleLinks.size < section.limit) {
                            articleLinks.add(JSON.stringify({ url: fullUrl, title: title.substring(0, 200) }));
                        }
                    }
                });

                if (articleLinks.size >= section.limit) break;
            }

            logger.info(`Found ${articleLinks.size} article links from ${section.name}`);

            // Convert Set back to array and parse
            const parsedLinks = Array.from(articleLinks).map(link => JSON.parse(link));

            // Scrape individual articles
            for (const [index, articleLink] of parsedLinks.entries()) {
                try {
                    logger.info(`Scraping article ${index + 1}/${parsedLinks.length} from ${section.name}...`);

                    const article = await this.scrapeIndividualArticle(articleLink.url, articleLink.title);
                    if (article && article.content.length > 200) {
                        articles.push({
                            ...article,
                            category: section.name,
                            source: 'The Guardian'
                        });
                    }

                    // Delay between individual articles
                    await new Promise(resolve => setTimeout(resolve, 1500));
                } catch (error) {
                    logger.warn(`Error scraping article ${articleLink.url}: ${error.message}`);
                    continue;
                }
            }

            return articles;
        } catch (error) {
            logger.error(`Error accessing Guardian ${section.name} section: ${error.message}`);
            return [];
        }
    }

    async scrapeIndividualArticle(url, title) {
        try {
            const response = await axios.get(url, {
                timeout: 12000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            // Remove unwanted elements
            $('script, style, nav, header, footer, aside, .ad, .advertisement, .social, .share, figure, .caption, .meta').remove();

            // Guardian-specific content selectors
            let content = '';
            const contentSelectors = [
                '.content__article-body p',
                'div[data-gu-name="body"] p',
                '.article-body-commercial-selector p',
                '#maincontent p'
            ];

            for (const selector of contentSelectors) {
                const paragraphs = $(selector);
                if (paragraphs.length >= 3) {
                    content = paragraphs
                        .map((i, el) => $(el).text().trim())
                        .get()
                        .filter(text => text.length > 30 && !text.includes('Guardian') && !text.includes('newsletter'))
                        .join(' ');

                    if (content.length > 300) {
                        break;
                    }
                }
            }

            // Fallback content extraction
            if (content.length < 300) {
                content = $('p')
                    .map((i, el) => $(el).text().trim())
                    .get()
                    .filter(text =>
                        text.length > 30 &&
                        !text.includes('cookie') &&
                        !text.includes('newsletter') &&
                        !text.includes('Guardian')
                    )
                    .slice(0, 15)
                    .join(' ');
            }

            // Get publication date
            let publishedAt = new Date().toISOString();
            const timeElement = $('time').attr('datetime');
            if (timeElement) {
                publishedAt = new Date(timeElement).toISOString();
            }

            // Clean title
            const cleanTitle = title.replace(/\s+/g, ' ').trim();

            if (content.length < 200) {
                throw new Error('Article content too short');
            }

            return {
                title: cleanTitle || 'Guardian Article',
                content: TextProcessor.cleanText(content),
                url: url,
                publishedAt: publishedAt
            };
        } catch (error) {
            logger.warn(`Error scraping individual Guardian article: ${error.message}`);
            return null;
        }
    }

    async storeArticlesInVectorStore(articles) {
        try {
            const articlesToStore = [];

            logger.info(`Processing ${articles.length} Guardian articles for embedding...`);

            for (const article of articles) {
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
                        category: article.category,
                        source: article.source
                    });
                }
            }

            logger.info(`Generated ${articlesToStore.length} chunks from ${articles.length} articles`);

            // Generate embeddings in batches
            const batchSize = 5;
            const embeddedArticles = [];

            for (let i = 0; i < articlesToStore.length; i += batchSize) {
                const batch = articlesToStore.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(articlesToStore.length / batchSize);

                try {
                    logger.info(`Processing embedding batch ${batchNumber}/${totalBatches}`);

                    const texts = batch.map(article => article.content);
                    const embeddings = await embeddingService.generateBatchEmbeddings(texts);

                    batch.forEach((article, index) => {
                        embeddedArticles.push({
                            ...article,
                            embedding: embeddings[index],
                            id: Date.now() + i + index
                        });
                    });

                    logger.info(`Completed batch ${batchNumber}/${totalBatches}`);

                    // Delay between batches to respect API limits
                    if (i + batchSize < articlesToStore.length) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    logger.error(`Error processing batch ${batchNumber}: ${error.message}`);
                    continue;
                }
            }

            if (embeddedArticles.length > 0) {
                await vectorStoreService.storeEmbeddings(embeddedArticles);
                logger.info(`Successfully stored ${embeddedArticles.length} Guardian article chunks in vector store`);
            } else {
                throw new Error('No articles were successfully processed for embedding');
            }

            return embeddedArticles.length;
        } catch (error) {
            logger.error('Error storing Guardian articles in vector store:', error);
            throw error;
        }
    }

    async getScrapingStats() {
        try {
            const collectionInfo = await vectorStoreService.getCollectionInfo();
            return {
                totalDocuments: collectionInfo.points_count || 0,
                lastScraping: new Date().toISOString(),
                source: 'The Guardian'
            };
        } catch (error) {
            logger.error('Error getting scraping stats:', error);
            return { totalDocuments: 0, lastScraping: null };
        }
    }
}

module.exports = new GuardianNewsService();