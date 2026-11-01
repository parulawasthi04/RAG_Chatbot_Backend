// src/scripts/ingestSampleData.js
require('dotenv').config();
const embeddingService = require('../services/embeddingService');
const vectorStoreService = require('../services/vectorStoreService');
const TextProcessor = require('../utils/textProcessor');
const config = require('../config/environment');
const logger = require('../utils/logger');

// Sample news articles for testing
const sampleArticles = [
    {
        title: "AI Technology Breakthrough in 2024",
        content: "Artificial intelligence researchers have announced a significant breakthrough in natural language processing technology. The new model demonstrates unprecedented accuracy in understanding context and generating human-like responses. This development could revolutionize how we interact with AI systems in various applications including customer service, education, and content creation. The research team spent three years developing the underlying architecture, which combines transformer models with novel attention mechanisms.",
        url: "https://example.com/ai-breakthrough",
        publishedAt: "2024-09-15T10:30:00Z"
    },
    {
        title: "Global Climate Summit Reaches Historic Agreement",
        content: "World leaders at the Global Climate Summit have reached a historic agreement on carbon emission reductions. The pact includes commitments from 195 countries to achieve net-zero emissions by 2050. Key provisions include transitioning to renewable energy sources, investing in green technology, and establishing a global carbon trading system. Environmental groups have praised the agreement as a crucial step in addressing climate change, while some critics argue the timeline may be too ambitious.",
        url: "https://example.com/climate-summit",
        publishedAt: "2024-09-14T14:20:00Z"
    },
    {
        title: "Electric Vehicle Market Sees Record Growth",
        content: "The electric vehicle market has experienced unprecedented growth in 2024, with sales increasing by 45% compared to the previous year. Major automakers have accelerated their EV production plans, and new charging infrastructure projects are being deployed worldwide. Tesla continues to lead the market, but traditional manufacturers like Ford, GM, and Volkswagen are gaining significant market share. The growth is driven by government incentives, falling battery costs, and increasing consumer awareness of environmental issues.",
        url: "https://example.com/ev-growth",
        publishedAt: "2024-09-14T09:15:00Z"
    },
    {
        title: "Breakthrough in Quantum Computing Research",
        content: "Scientists at a leading research university have achieved a major breakthrough in quantum computing, successfully demonstrating quantum error correction at scale. The experiment involved a 1000-qubit quantum processor that maintained quantum coherence for several minutes, far exceeding previous records. This advancement brings practical quantum computing applications closer to reality, with potential impacts on cryptography, drug discovery, and financial modeling. The research was funded by government agencies and private tech companies.",
        url: "https://example.com/quantum-computing",
        publishedAt: "2024-09-13T16:45:00Z"
    },
    {
        title: "New Space Mission to Explore Mars Launched",
        content: "A groundbreaking space mission to Mars was successfully launched today, carrying advanced scientific instruments designed to search for signs of past or present life. The mission includes a sophisticated rover equipped with drilling capabilities and a laboratory for analyzing soil samples. The spacecraft is expected to reach Mars in seven months and will operate for at least two years. This mission represents a collaboration between multiple space agencies and aims to prepare for future human missions to the Red Planet.",
        url: "https://example.com/mars-mission",
        publishedAt: "2024-09-13T11:30:00Z"
    },
    {
        title: "Major Cybersecurity Threats Identified in 2024",
        content: "Cybersecurity experts have identified several emerging threats that pose significant risks to businesses and individuals in 2024. These include AI-powered phishing attacks, ransomware targeting cloud infrastructure, and sophisticated social engineering schemes. Organizations are advised to implement zero-trust security models, conduct regular security audits, and invest in employee training programs. The report highlights the importance of international cooperation in addressing cyber threats and protecting critical infrastructure.",
        url: "https://example.com/cybersecurity-threats",
        publishedAt: "2024-09-12T13:25:00Z"
    },
    {
        title: "Revolutionary Medical Treatment Shows Promise",
        content: "A new gene therapy treatment for rare genetic disorders has shown remarkable results in clinical trials. The treatment, which uses CRISPR technology to correct genetic defects, successfully treated 85% of patients in the trial. Side effects were minimal, and patients showed sustained improvement over a 12-month follow-up period. The FDA is fast-tracking the approval process, and the treatment could be available to patients within the next two years. This breakthrough offers hope to millions of people with genetic disorders worldwide.",
        url: "https://example.com/gene-therapy",
        publishedAt: "2024-09-12T08:40:00Z"
    },
    {
        title: "Global Economy Shows Signs of Recovery",
        content: "Economic indicators suggest that the global economy is showing signs of recovery after a challenging period. GDP growth has exceeded expectations in major economies, unemployment rates are declining, and consumer confidence is improving. Central banks are carefully monitoring inflation rates while maintaining supportive monetary policies. However, experts warn that challenges remain, including supply chain disruptions, geopolitical tensions, and the ongoing transition to sustainable energy sources.",
        url: "https://example.com/economic-recovery",
        publishedAt: "2024-09-11T15:10:00Z"
    },
    {
        title: "Renewable Energy Reaches New Milestone",
        content: "Renewable energy sources have reached a new milestone, now accounting for 35% of global electricity generation. Solar and wind power have seen the most significant growth, with costs continuing to decline. Major energy companies are investing heavily in renewable infrastructure, and governments worldwide are implementing supportive policies. The transition to clean energy is creating new jobs and driving innovation in energy storage technologies. Experts predict renewable energy could reach 50% of global generation by 2030.",
        url: "https://example.com/renewable-energy",
        publishedAt: "2024-09-11T12:55:00Z"
    },
    {
        title: "Advances in Personalized Medicine",
        content: "Personalized medicine is advancing rapidly with new technologies that tailor treatments to individual patients based on their genetic profiles. Recent studies show that personalized treatments are significantly more effective than traditional one-size-fits-all approaches. Pharmaceutical companies are developing targeted therapies for cancer, cardiovascular disease, and neurological disorders. The integration of artificial intelligence and big data analytics is accelerating the development of personalized treatment protocols.",
        url: "https://example.com/personalized-medicine",
        publishedAt: "2024-09-10T14:30:00Z"
    },
    {
        title: "Smart Cities Initiative Expands Globally",
        content: "The smart cities initiative is expanding globally, with over 200 cities worldwide implementing IoT technologies to improve urban living. These smart city projects focus on traffic management, energy efficiency, waste reduction, and public safety. Citizens report improved quality of life, reduced commute times, and better access to city services. The initiative involves partnerships between governments, technology companies, and research institutions. Investment in smart city technologies is expected to reach $2.5 trillion by 2025.",
        url: "https://example.com/smart-cities",
        publishedAt: "2024-09-10T09:20:00Z"
    },
    {
        title: "Breakthrough in Alzheimer's Disease Research",
        content: "Researchers have announced a significant breakthrough in Alzheimer's disease treatment, with a new drug showing promise in slowing cognitive decline. The treatment targets amyloid plaques in the brain and has demonstrated positive results in Phase III clinical trials. Patients receiving the treatment showed a 27% slower rate of cognitive decline compared to the placebo group. The research team is preparing to submit the drug for regulatory approval and hopes to make it available to patients within two years.",
        url: "https://example.com/alzheimers-research",
        publishedAt: "2024-09-09T16:15:00Z"
    },
    {
        title: "Sustainable Agriculture Technologies Gain Momentum",
        content: "Sustainable agriculture technologies are gaining momentum as farmers worldwide adopt precision farming techniques to increase yields while reducing environmental impact. These technologies include drone monitoring, soil sensors, automated irrigation systems, and AI-powered crop management. Early adopters report 20-30% increases in crop yields and significant reductions in water and fertilizer usage. Government programs are providing incentives for farmers to transition to sustainable practices.",
        url: "https://example.com/sustainable-agriculture",
        publishedAt: "2024-09-09T11:45:00Z"
    },
    {
        title: "Space Tourism Industry Takes Off",
        content: "The space tourism industry is officially taking off, with several companies now offering commercial flights to the edge of space. Recent successful missions have demonstrated the safety and viability of space tourism for civilians. Ticket prices are gradually decreasing as technology improves and production scales up. Industry experts predict that space tourism could become accessible to middle-class travelers within the next decade. The industry is also driving innovation in aerospace technology and creating new job opportunities.",
        url: "https://example.com/space-tourism",
        publishedAt: "2024-09-08T13:30:00Z"
    },
    {
        title: "5G Technology Revolutionizes Healthcare",
        content: "5G technology is revolutionizing healthcare by enabling real-time remote surgery, instant medical data transmission, and advanced telemedicine applications. Hospitals equipped with 5G networks can perform complex procedures remotely, allowing specialist surgeons to operate on patients thousands of miles away. The technology also enables real-time monitoring of patients with chronic conditions and faster emergency response times. Healthcare providers report improved patient outcomes and reduced costs.",
        url: "https://example.com/5g-healthcare",
        publishedAt: "2024-09-08T10:10:00Z"
    }
];

async function ingestSampleData() {
    try {
        logger.info('🚀 Starting sample data ingestion...');

        // Initialize Qdrant collection first
        await vectorStoreService.initializeCollection();

        const articlesToStore = [];

        for (const article of sampleArticles) {
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
                    publishedAt: article.publishedAt
                });
            }
        }

        logger.info(`📝 Processing ${articlesToStore.length} article chunks...`);

        // Generate embeddings in batches
        const batchSize = 5; // Smaller batch size for testing
        const embeddedArticles = [];

        for (let i = 0; i < articlesToStore.length; i += batchSize) {
            const batch = articlesToStore.slice(i, i + batchSize);
            const texts = batch.map(article => article.content);

            try {
                logger.info(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articlesToStore.length / batchSize)}`);
                const embeddings = await embeddingService.generateBatchEmbeddings(texts);

                batch.forEach((article, index) => {
                    embeddedArticles.push({
                        ...article,
                        embedding: embeddings[index],
                        id: Date.now() + i + index
                    });
                });

                logger.info(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articlesToStore.length / batchSize)}`);

                // Add delay between batches
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                logger.error(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
                continue;
            }
        }

        if (embeddedArticles.length > 0) {
            await vectorStoreService.storeEmbeddings(embeddedArticles);
            logger.info(`🎉 Successfully stored ${embeddedArticles.length} article chunks in vector store`);
        } else {
            logger.warn('⚠️  No articles were processed successfully');
        }

        // Get final stats
        const stats = await vectorStoreService.getCollectionInfo();
        logger.info('📊 Final stats:', {
            totalDocuments: stats.points_count,
            lastIngestion: new Date().toISOString()
        });

        logger.info('✅ Sample data ingestion completed successfully!');
        return embeddedArticles.length;

    } catch (error) {
        logger.error('❌ Sample data ingestion failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    ingestSampleData()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = ingestSampleData;