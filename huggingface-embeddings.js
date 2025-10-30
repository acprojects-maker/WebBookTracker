/**
 * Hugging Face Embeddings Integration
 * Uses HF Inference API (free tier: 30,000 requests/month) to generate
 * high-quality embeddings for book descriptions.
 *
 * Model: sentence-transformers/all-mpnet-base-v2
 * - 768 dimensions (vs 384 from gte-small)
 * - +20% quality improvement over local models
 * - Optimized for semantic search and retrieval
 */

class HuggingFaceEmbeddings {
  constructor(apiKey) {
    if (!apiKey || apiKey === 'YOUR_HF_TOKEN_HERE') {
      console.warn('⚠️ Hugging Face API token not configured. Using local embeddings only.');
      this.enabled = false;
      return;
    }

    this.apiKey = apiKey;
    this.baseUrl = 'https://api-inference.huggingface.co/models';
    this.model = 'sentence-transformers/all-mpnet-base-v2';
    this.enabled = true;

    // Cache for embeddings (persistent via IndexedDB)
    this.cache = new Map();
    this.cacheDb = null;

    // Quota tracking (30K/month = ~1000/day)
    this.monthlyLimit = 30000;
    this.dailyLimit = 1000;

    console.log('🤗 Hugging Face embeddings initialized');

    // Initialize IndexedDB cache
    this.initializeCache();
  }

  /**
   * Initialize IndexedDB for persistent embedding cache
   */
  async initializeCache() {
    try {
      const dbName = 'hf_embeddings_cache';
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('embeddings')) {
          const store = db.createObjectStore('embeddings', { keyPath: 'text' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.cacheDb = event.target.result;
        console.log('💾 HF embeddings cache initialized');
        this.loadCacheToMemory();
      };

      request.onerror = (event) => {
        console.warn('Failed to initialize HF cache:', event.target.error);
      };
    } catch (error) {
      console.warn('IndexedDB not available:', error);
    }
  }

  /**
   * Load frequently used embeddings to memory for faster access
   */
  async loadCacheToMemory() {
    if (!this.cacheDb) return;

    try {
      const transaction = this.cacheDb.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        // Load most recent 100 to memory
        const sorted = entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
        sorted.forEach(entry => {
          this.cache.set(entry.text, entry.embedding);
        });
        console.log(`📦 Loaded ${sorted.length} cached embeddings to memory`);
      };
    } catch (error) {
      console.warn('Failed to load cache to memory:', error);
    }
  }

  /**
   * Get cached embedding from memory or IndexedDB
   */
  async getCachedEmbedding(text) {
    // Check memory cache first (instant)
    if (this.cache.has(text)) {
      return this.cache.get(text);
    }

    // Check IndexedDB (fast)
    if (this.cacheDb) {
      try {
        const transaction = this.cacheDb.transaction(['embeddings'], 'readonly');
        const store = transaction.objectStore('embeddings');
        const request = store.get(text);

        return new Promise((resolve) => {
          request.onsuccess = () => {
            if (request.result) {
              const embedding = request.result.embedding;
              // Promote to memory cache
              this.cache.set(text, embedding);
              resolve(embedding);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
        });
      } catch (error) {
        console.warn('Cache lookup failed:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Save embedding to both memory and IndexedDB
   */
  async cacheEmbedding(text, embedding) {
    // Save to memory
    this.cache.set(text, embedding);

    // Save to IndexedDB for persistence
    if (this.cacheDb) {
      try {
        const transaction = this.cacheDb.transaction(['embeddings'], 'readwrite');
        const store = transaction.objectStore('embeddings');
        store.put({
          text,
          embedding,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('Failed to cache embedding:', error);
      }
    }
  }

  /**
   * Generate single embedding
   * @param {string} text - Text to embed
   * @returns {Promise<Array>} Embedding vector (768-dim)
   */
  async generateEmbedding(text) {
    if (!this.enabled) {
      throw new Error('Hugging Face embeddings not enabled');
    }

    // Check cache first
    const cached = await this.getCachedEmbedding(text);
    if (cached) {
      console.log('🎯 HF embedding cache hit');
      return cached;
    }

    // Check quota
    if (!this.hasQuota()) {
      console.warn('⚠️ HF daily quota exhausted');
      throw new Error('HF quota exhausted');
    }

    // Call API
    try {
      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API error (${response.status}): ${errorText}`);
      }

      const embedding = await response.json();

      // HF returns nested array, flatten it
      const flatEmbedding = Array.isArray(embedding[0]) ? embedding[0] : embedding;

      // Cache the result
      await this.cacheEmbedding(text, flatEmbedding);

      // Update quota
      this.incrementQuota();

      return flatEmbedding;

    } catch (error) {
      console.error('HF embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * More efficient than calling generateEmbedding multiple times
   *
   * @param {Array<string>} texts - Texts to embed
   * @returns {Promise<Array<Array>>} Array of embedding vectors
   */
  async batchEmbeddings(texts) {
    if (!this.enabled) {
      throw new Error('Hugging Face embeddings not enabled');
    }

    const results = new Array(texts.length);
    const uncachedIndices = [];
    const uncachedTexts = [];

    // Check which texts are already cached
    for (let i = 0; i < texts.length; i++) {
      const cached = await this.getCachedEmbedding(texts[i]);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    if (uncachedTexts.length === 0) {
      console.log('🎯 All embeddings cached!');
      return results;
    }

    console.log(`📡 Generating ${uncachedTexts.length} embeddings via HF API...`);

    // Check quota (each text = 1 request)
    if (!this.hasQuota(uncachedTexts.length)) {
      console.warn(`⚠️ Insufficient HF quota for ${uncachedTexts.length} embeddings`);
      throw new Error('Insufficient HF quota');
    }

    // Process in chunks of 10 to avoid timeouts
    const chunkSize = 10;
    for (let i = 0; i < uncachedTexts.length; i += chunkSize) {
      const chunk = uncachedTexts.slice(i, i + chunkSize);
      const chunkIndices = uncachedIndices.slice(i, i + chunkSize);

      try {
        // Call API with batch of texts
        const response = await fetch(`${this.baseUrl}/${this.model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: chunk,
            options: { wait_for_model: true }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`HF batch API error (${response.status}):`, errorText);

          // Fallback: try individual requests
          for (let j = 0; j < chunk.length; j++) {
            try {
              const embedding = await this.generateEmbedding(chunk[j]);
              const originalIndex = chunkIndices[j];
              results[originalIndex] = embedding;
            } catch (err) {
              console.error(`Failed to generate embedding for text ${j}:`, err);
            }
          }
          continue;
        }

        const embeddings = await response.json();

        // Process results
        for (let j = 0; j < chunk.length; j++) {
          const embedding = Array.isArray(embeddings[j][0])
            ? embeddings[j][0]
            : embeddings[j];

          const originalIndex = chunkIndices[j];
          results[originalIndex] = embedding;

          // Cache each embedding
          await this.cacheEmbedding(chunk[j], embedding);
        }

        // Update quota for batch
        this.incrementQuota(chunk.length);

      } catch (error) {
        console.error('Batch embedding failed:', error);
        // Continue with next chunk
      }

      // Rate limiting: wait 100ms between chunks
      if (i + chunkSize < uncachedTexts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Check if we have quota remaining
   */
  hasQuota(requestCount = 1) {
    const today = new Date().toDateString();
    const quotaKey = `hf_quota_${today}`;
    const currentQuota = parseInt(localStorage.getItem(quotaKey) || '0');

    return currentQuota + requestCount <= this.dailyLimit;
  }

  /**
   * Increment quota counter
   */
  incrementQuota(count = 1) {
    const today = new Date().toDateString();
    const quotaKey = `hf_quota_${today}`;
    const currentQuota = parseInt(localStorage.getItem(quotaKey) || '0');
    const newQuota = currentQuota + count;

    localStorage.setItem(quotaKey, newQuota.toString());

    // Warn when approaching limit
    if (newQuota >= this.dailyLimit * 0.8) {
      console.warn(`⚠️ HF quota at ${((newQuota/this.dailyLimit)*100).toFixed(0)}%: ${newQuota}/${this.dailyLimit}`);
    }

    return newQuota;
  }

  /**
   * Get current quota status
   */
  getQuotaStatus() {
    const today = new Date().toDateString();
    const quotaKey = `hf_quota_${today}`;
    const used = parseInt(localStorage.getItem(quotaKey) || '0');
    const remaining = this.dailyLimit - used;
    const percentage = ((used / this.dailyLimit) * 100).toFixed(1);

    return {
      used,
      remaining,
      limit: this.dailyLimit,
      percentage: `${percentage}%`,
      date: today
    };
  }

  /**
   * Reset quota (for testing)
   */
  resetQuota() {
    const today = new Date().toDateString();
    const quotaKey = `hf_quota_${today}`;
    localStorage.removeItem(quotaKey);
    console.log('🔄 HF quota reset');
  }

  /**
   * Clear all cached embeddings
   */
  async clearCache() {
    this.cache.clear();

    if (this.cacheDb) {
      const transaction = this.cacheDb.transaction(['embeddings'], 'readwrite');
      const store = transaction.objectStore('embeddings');
      store.clear();
      console.log('🗑️ HF embeddings cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      memoryCacheSize: this.cache.size,
      enabled: this.enabled
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HuggingFaceEmbeddings;
}
