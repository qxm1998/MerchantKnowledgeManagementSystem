const { ChromaClient } = require('chromadb');
const logger = require('../../../shared/utils/logger');
const config = require('../config');

class VectorStore {
  constructor() {
    this.client = null;
    this.collection = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return this;

    try {
      this.client = new ChromaClient({
        host: config.chroma.host,
        port: config.chroma.port
      });

      // 获取或创建集合（如果不存在则自动创建）
      try {
        // 尝试使用 getOrCreateCollection（推荐方法）
        if (typeof this.client.getOrCreateCollection === 'function') {
          this.collection = await this.client.getOrCreateCollection({
            name: config.chroma.collectionName,
            metadata: { description: 'Knowledge base documents' }
          });
          logger.info('已获取或创建 Chroma 集合', { 
            collection: config.chroma.collectionName 
          });
        } else {
          // 如果没有 getOrCreateCollection，尝试分别获取和创建
          try {
            this.collection = await this.client.getCollection({
              name: config.chroma.collectionName
            });
            logger.info('已连接到现有 Chroma 集合', { 
              collection: config.chroma.collectionName 
            });
          } catch (getError) {
            // 集合不存在，创建新集合
            logger.warn('Chroma 集合不存在，正在创建新集合', { 
              collection: config.chroma.collectionName 
            });
            this.collection = await this.client.createCollection({
              name: config.chroma.collectionName,
              metadata: { description: 'Knowledge base documents' }
            });
            logger.info('已创建新的 Chroma 集合', { 
              collection: config.chroma.collectionName 
            });
          }
        }
      } catch (collectionError) {
        logger.error('Chroma 集合操作失败', { 
          collection: config.chroma.collectionName,
          error: collectionError.message 
        });
        throw collectionError;
      }

      this.initialized = true;
      return this;
    } catch (error) {
      logger.error('Chroma 初始化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 向量相似度搜索
   * 从向量数据库中检索相似文档
   */
  async similaritySearch(queryEmbedding, topK = 5, filterFn = null) {
    if (!this.initialized) await this.init();

    if (!Array.isArray(queryEmbedding)) {
      throw new Error('查询向量必须是数组');
    }

    try {
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK
      });

      const formatted = [];
      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const metadata = results.metadatas ? (results.metadatas[0][i] || {}) : {};
          const item = {
            id: results.ids[0][i],
            text: results.documents[0][i] || '',
            metadata: metadata,
            score: results.distances ? (1 - results.distances[0][i]) : null
          };
          
          // 应用过滤器
          if (!filterFn || filterFn(item)) {
            formatted.push(item);
          }
        }
      }

      // 按分数排序
      formatted.sort((a, b) => (b.score || 0) - (a.score || 0));

      return formatted;
    } catch (error) {
      logger.error('向量相似度搜索失败', { error: error.message });
      throw error;
    }
  }
}

module.exports = new VectorStore();

