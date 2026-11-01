// src/services/webScrapingNewsService.js - Alternative to RSS
const axios = require('axios');
const cheerio = require('cheerio');
const embeddingService = require('./embeddingService');
const vectorStoreService = require('./vectorStoreService');
const TextProcessor = require('../utils/textProcessor');
const config = require('../config/environment');
const logger = require('../utils/logger');

class WebScrapingNewsService {
    constructor() {
        this.newsSources = [
            {
                name: 'Hacker News',
                url: 'https://news.ycombinator.com/',
                articleSelector: '.titleline a',
                titleSelector: '.titleline a',
                contentSelector: '.comment'
            },
            {
                name: 'Reuters (Direct)',
                url: 'https://www.reuters.com/business/technology/',
                articleSelector: 'h3 a',
                titleSelector: 'h3 a',
                contentSelector: 'p'
            },
            {
                name: 'BBC Tech',
                url: 'https://www.bbc.com/news/technology',
                articleSelector: 'h3 a',
                titleSelector: 'h3 a',
                contentSelector: '[data-component="text-block"] p'
            }
        ];
    }

    async ingestFromWebScraping() {
        const allArticles = [];

        logger.info('Starting web scraping news ingestion...');

        for (const source of this.newsSources) {
            try {
                logger.info(`Scraping from ${source.name}: ${source.url}`);
                const articles = await this.scrapeNewsSource(source);

                if (articles.length > 0) {
                    allArticles.push(...articles);
                    logger.info(`Successfully scraped ${articles.length} articles from ${source.name}`);
                }

                // Delay between sources
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                logger.error(`Error scraping ${source.name}: ${error.message}`);
                continue;
            }
        }

        if (allArticles.length === 0) {
            logger.warn('No articles scraped, falling back to hardcoded news data');
            return await this.useHardcodedNews();
        }

        logger.info(`Total articles scraped: ${allArticles.length}`);

        // Limit to 50 articles
        const articlesToProcess = allArticles.slice(0, 50);
        await this.storeArticlesInVectorStore(articlesToProcess);

        return articlesToProcess;
    }

    async scrapeNewsSource(source) {
        try {
            const response = await axios.get(source.url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const articles = [];

            // Get article links
            const articleLinks = [];
            $(source.articleSelector).each((i, element) => {
                if (i >= 10) return false; // Limit to 10 articles per source

                let link = $(element).attr('href');
                if (link) {
                    // Convert relative URLs to absolute
                    if (link.startsWith('/')) {
                        const baseUrl = new URL(source.url).origin;
                        link = baseUrl + link;
                    } else if (!link.startsWith('http')) {
                        link = source.url + link;
                    }

                    const title = $(element).text().trim();
                    if (title && title.length > 10) {
                        articleLinks.push({ url: link, title: title });
                    }
                }
            });

            logger.info(`Found ${articleLinks.length} article links from ${source.name}`);

            // Scrape individual articles
            for (const articleLink of articleLinks.slice(0, 5)) { // Limit to 5 per source
                try {
                    const article = await this.scrapeIndividualArticle(articleLink.url, articleLink.title);
                    if (article && article.content.length > 100) {
                        articles.push({
                            ...article,
                            source: source.name
                        });
                    }

                    // Delay between individual articles
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    logger.warn(`Error scraping article ${articleLink.url}: ${error.message}`);
                    continue;
                }
            }

            return articles;
        } catch (error) {
            logger.error(`Error accessing ${source.name}: ${error.message}`);
            return [];
        }
    }

    async scrapeIndividualArticle(url, title) {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            // Remove unwanted elements
            $('script, style, nav, header, footer, aside, .advertisement, .ad, .social, .share, .newsletter').remove();

            // Try multiple selectors to find article content
            let content = '';
            const contentSelectors = [
                'article p',
                '[class*="content"] p',
                '[class*="article"] p',
                '[class*="story"] p',
                '.post-content p',
                '.entry-content p',
                'main p',
                '.text p',
                '[data-component="text-block"] p'
            ];

            for (const selector of contentSelectors) {
                const paragraphs = $(selector);
                if (paragraphs.length >= 2) {
                    content = paragraphs
                        .map((i, el) => $(el).text().trim())
                        .get()
                        .filter(text => text.length > 20)
                        .join(' ');

                    if (content.length > 200) {
                        break;
                    }
                }
            }

            if (content.length < 100) {
                // Fallback: get all paragraph text
                content = $('p').map((i, el) => $(el).text().trim()).get()
                    .filter(text => text.length > 20)
                    .slice(0, 10)
                    .join(' ');
            }

            return {
                title: title || $('h1').first().text().trim() || 'Untitled Article',
                content: TextProcessor.cleanText(content),
                url: url,
                publishedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.warn(`Error scraping individual article: ${error.message}`);
            return null;
        }
    }

    async useHardcodedNews() {
        // Fallback hardcoded current news articles
        const hardcodedArticles = [
            {
                title: "Major Tech Companies Announce AI Safety Initiative",
                content: "Leading technology companies including Google, Microsoft, and OpenAI have announced a joint initiative focused on AI safety research. The collaboration aims to develop standardized safety protocols for artificial intelligence systems and share research findings across the industry. The initiative comes as AI technologies become increasingly integrated into critical infrastructure and daily life applications.",
                url: "https://example.com/ai-safety-initiative",
                publishedAt: new Date().toISOString(),
                source: "Tech Industry News"
            },
            {
                title: "Breakthrough in Quantum Computing Achieved",
                content: "Researchers at a leading university have achieved a significant breakthrough in quantum computing by successfully demonstrating error correction at scale. The new quantum processor maintained coherence for over 100 seconds, setting a new record. This advancement could accelerate the development of practical quantum computers for applications in cryptography, drug discovery, and financial modeling.",
                url: "https://example.com/quantum-breakthrough",
                publishedAt: new Date().toISOString(),
                source: "Science News"
            },
            {
                title: "Global Climate Summit Reaches New Agreements",
                content: "The latest global climate summit has concluded with new international agreements on carbon emission reductions and renewable energy investments. Over 150 countries committed to achieving net-zero emissions by 2050, with specific milestones for 2030 and 2040. The agreements include provisions for technology transfer and financial assistance to developing nations.",
                url: "https://example.com/climate-summit-2024",
                publishedAt: new Date().toISOString(),
                source: "Environmental News"
            },
            {
                title: "Electric Vehicle Sales Surge Globally",
                content: "Electric vehicle sales have reached a new milestone globally, with over 10 million units sold this year. The growth is driven by improved battery technology, expanded charging infrastructure, and government incentives. Major automakers are accelerating their transition to electric vehicles, with many announcing plans to phase out internal combustion engines within the next decade.",
                url: "https://example.com/ev-sales-surge",
                publishedAt: new Date().toISOString(),
                source: "Automotive News"
            },
            {
                title: "New Medical Treatment Shows Promise in Clinical Trials",
                content: "A revolutionary gene therapy treatment for rare genetic diseases has shown remarkable success in Phase III clinical trials. The treatment successfully corrected genetic defects in 90% of patients, with minimal side effects reported. The therapy uses CRISPR technology to edit genes directly in patients, offering hope for treating previously incurable conditions.",
                url: "https://example.com/gene-therapy-breakthrough",
                publishedAt: new Date().toISOString(),
                source: "Medical Journal"
            }
        ];

        logger.info('Using hardcoded news articles as fallback');
        await this.storeArticlesInVectorStore(hardcodedArticles);
        return hardcodedArticles;
    }

    async storeArticlesInVectorStore(articles) {
        try {
            const articlesToStore = [];

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
                        source: article.source
                    });
                }
            }

            // Generate embeddings in batches
            const batchSize = 5;
            const embeddedArticles = [];

            for (let i = 0; i < articlesToStore.length; i += batchSize) {
                const batch = articlesToStore.slice(i, i + batchSize);
                const texts = batch.map(article => article.content);

                try {
                    const embeddings = await embeddingService.generateBatchEmbeddings(texts);

                    batch.forEach((article, index) => {
                        embeddedArticles.push({
                            ...article,
                            embedding: embeddings[index],
                            id: Date.now() + i + index
                        });
                    });

                    logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articlesToStore.length / batchSize)}`);

                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    logger.error(`Error processing batch: ${error.message}`);
                    continue;
                }
            }

            if (embeddedArticles.length > 0) {
                await vectorStoreService.storeEmbeddings(embeddedArticles);
                logger.info(`Successfully stored ${embeddedArticles.length} article chunks in vector store`);
            }

            return embeddedArticles.length;
        } catch (error) {
            logger.error('Error storing articles in vector store:', error);
            throw error;
        }
    }
}

module.exports = new WebScrapingNewsService();