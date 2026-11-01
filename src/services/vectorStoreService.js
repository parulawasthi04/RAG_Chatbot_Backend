// src/services/vectorStoreService.js - Updated for Jina v3 embeddings
const qdrantConnection = require('../config/qdrant');
const config = require('../config/environment');
const logger = require('../utils/logger');

class VectorStoreService {
  constructor() {
    this.client = qdrantConnection.getClient();
    this.collectionName = config.qdrant.collection;
  }

  async initializeCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (!collectionExists) {
        // Jina v3 embeddings have different dimensions
        // We'll create the collection with auto-detect or check the actual dimension
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1024, // Jina v3 typically uses 1024 dimensions (updated from 768)
            distance: 'Cosine'
          }
        });
        logger.info(`✅ Created Qdrant collection: ${this.collectionName} with 1024 dimensions`);
      } else {
        // Check existing collection info
        const collectionInfo = await this.client.getCollection(this.collectionName);
        const vectorSize = collectionInfo.config.params.vectors.size;
        logger.info(`✅ Using existing Qdrant collection: ${this.collectionName} with ${vectorSize} dimensions`);
      }

      return true;
    } catch (error) {
      logger.error('❌ Error initializing collection:', error);

      // If dimension mismatch, try to recreate with correct dimensions
      if (error.message.includes('dimension')) {
        logger.info('🔄 Trying to recreate collection with correct dimensions...');
        try {
          // Delete existing collection and recreate
          await this.client.deleteCollection(this.collectionName);
          await this.client.createCollection(this.collectionName, {
            vectors: {
              size: 1024, // Use 1024 for Jina v3
              distance: 'Cosine'
            }
          });
          logger.info(`✅ Recreated collection with 1024 dimensions`);
          return true;
        } catch (recreateError) {
          logger.error('❌ Failed to recreate collection:', recreateError);
          throw recreateError;
        }
      }

      throw error;
    }
  }

  async storeEmbeddings(embeddings) {
    try {
      const points = embeddings.map((item, index) => ({
        id: item.id || index + 1,
        vector: item.embedding,
        payload: {
          content: item.content,
          title: item.title || '',
          url: item.url || '',
          publishedAt: item.publishedAt || new Date().toISOString()
        }
      }));

      // Validate embedding dimensions before storing
      if (points.length > 0 && points[0].vector) {
        const actualDimension = points[0].vector.length;
        logger.info(`📊 Storing embeddings with ${actualDimension} dimensions`);

        // Check if collection dimensions match
        const collectionInfo = await this.client.getCollection(this.collectionName);
        const expectedDimension = collectionInfo.config.params.vectors.size;

        if (actualDimension !== expectedDimension) {
          logger.warn(`⚠️  Dimension mismatch: embeddings have ${actualDimension}, collection expects ${expectedDimension}`);

          // Recreate collection with correct dimensions
          await this.client.deleteCollection(this.collectionName);
          await this.client.createCollection(this.collectionName, {
            vectors: {
              size: actualDimension,
              distance: 'Cosine'
            }
          });
          logger.info(`🔄 Recreated collection with ${actualDimension} dimensions`);
        }
      }

      const result = await this.client.upsert(this.collectionName, {
        wait: true,
        points
      });

      logger.info(`✅ Stored ${points.length} embeddings in Qdrant`);
      return result;
    } catch (error) {
      logger.error('❌ Error storing embeddings:', error);
      throw error;
    }
  }

  async searchSimilar(queryEmbedding, topK = 5) {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: topK,
        with_payload: true,
        score_threshold: 0.3 // Only return results with similarity > 0.7
      });

      logger.info(`🔍 Found ${searchResult.length} similar results`);

      return searchResult.map(result => ({
        content: result.payload.content,
        title: result.payload.title,
        url: result.payload.url,
        score: result.score
      }));
    } catch (error) {
      logger.error('❌ Error searching similar vectors:', error);
      throw error;
    }
  }

  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info;
    } catch (error) {
      logger.error('❌ Error getting collection info:', error);
      throw error;
    }
  }

  async getCollectionStats() {
    try {
      const info = await this.getCollectionInfo();
      return {
        points_count: info.points_count,
        vectors_count: info.indexed_vectors_count,
        segments_count: info.segments_count,
        status: info.status,
        vector_size: info.config.params.vectors.size
      };
    } catch (error) {
      logger.error('❌ Error getting collection stats:', error);
      return { points_count: 0, vectors_count: 0, segments_count: 0, status: 'error' };
    }
  }
}

module.exports = new VectorStoreService();