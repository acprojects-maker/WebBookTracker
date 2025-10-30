class CohereReranker {
  constructor(apiKey) {
    if (!apiKey || apiKey === 'YOUR_COHERE_API_KEY_HERE') {
      console.warn('⚠️ Cohere API key not configured. Reranking disabled.');
      this.enabled = false;
      return;
    }

    this.apiKey = apiKey;
    this.baseUrl = 'https://api.cohere.com/v1';
    this.model = 'rerank-english-v3.0';
    this.enabled = true;

    // Quota tracking (100/day free tier)
    this.dailyLimit = 100;

    // Cache for reranked results
    this.cache = new Map();
    this.cacheTTL = 60 * 60 * 1000; // 1 hour

    console.log('🎯 Cohere reranker initialized');

    // Load cache from localStorage
    this.loadCacheFromStorage();
  }

  /**
   * Load cached rerank results from localStorage
   */
  loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem('cohere_rerank_cache');
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        // Filter out expired entries
        Object.entries(data).forEach(([key, entry]) => {
          if (now - entry.timestamp < this.cacheTTL) {
            this.cache.set(key, entry);
          }
        });

        console.log(`📦 Loaded ${this.cache.size} cached rerank results`);
      }
    } catch (error) {
      console.warn('Failed to load Cohere cache:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  saveCacheToStorage() {
    try {
      const cacheObj = {};
      this.cache.forEach((value, key) => {
        cacheObj[key] = value;
      });
      localStorage.setItem('cohere_rerank_cache', JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to save Cohere cache:', error);
    }
  }

  /**
   * Determine if query should use reranking
   * Only use for complex queries to conserve quota
   */
  shouldRerank(query, resultsCount) {
    if (!this.enabled) return false;
    if (resultsCount < 10) return false; // Not worth it for <10 results
    if (!this.hasQuota()) return false;

    // Rerank if:
    const words = query.split(/\s+/).length;
    const hasComparison = /like|meets|similar|but|without/i.test(query);
    const hasMultipleThemes = /and|with|featuring/g.test(query) && words > 6;
    const isComplex = words >= 8 || hasComparison || hasMultipleThemes;

    return isComplex;
  }

  /**
   * Rerank search results by relevance
   *
   * @param {string} query - Original user query
   * @param {Array} documents - Array of book objects to rerank
   * @param {number} topN - Number of top results to return (default: 20)
   * @returns {Promise<Array>} Reranked documents with relevance scores
   */
  async rerank(query, documents, topN = 20) {
    if (!this.enabled) {
      console.log('⚡ Cohere reranking disabled, returning original order');
      return documents.slice(0, topN);
    }

    if (!this.shouldRerank(query, documents.length)) {
      console.log('⚡ Skipping rerank (simple query or low result count)');
      return documents.slice(0, topN);
    }

    // Check cache first
    const cacheKey = this.getCacheKey(query, documents);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('🎯 Cohere rerank cache hit');
      return cached.results;
    }

    // Prepare documents for Cohere API
    const cohereDocuments = documents.map(doc => {
      // Create rich text representation for reranking
      let text = `${doc.title} by ${doc.author || 'Unknown'}`;

      if (doc.description) {
        text += `. ${doc.description.substring(0, 500)}`;
      }

      if (doc.categories && doc.categories.length > 0) {
        text += ` Genre: ${doc.categories.join(', ')}`;
      }

      if (doc.publishedDate) {
        text += ` Published: ${doc.publishedDate}`;
      }

      return text;
    });

    try {
      console.log(`🎯 Reranking ${documents.length} results with Cohere...`);
      const startTime = Date.now();

      const response = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          query: query,
          documents: cohereDocuments,
          top_n: Math.min(topN, documents.length),
          return_documents: false // We already have the documents
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cohere API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      console.log(`✨ Reranked in ${latency}ms`);

      // Map reranked results back to original documents
      const rerankedDocs = data.results.map(result => ({
        ...documents[result.index],
        rerankScore: result.relevance_score,
        originalRank: result.index + 1,
        wasReranked: true
      }));

      // Update quota
      this.incrementQuota();

      // Cache the results
      this.cache.set(cacheKey, {
        results: rerankedDocs,
        timestamp: Date.now()
      });
      this.saveCacheToStorage();

      return rerankedDocs;

    } catch (error) {
      console.error('❌ Cohere reranking failed:', error);
      console.log('⚡ Falling back to original ranking');

      // Return original order as fallback
      return documents.slice(0, topN);
    }
  }

  /**
   * Rerank with detailed scoring information
   * Useful for debugging and understanding why results are ranked as they are
   */
  async rerankWithDetails(query, documents, topN = 20) {
    const reranked = await this.rerank(query, documents, topN);

    return reranked.map((doc, index) => ({
      ...doc,
      rerankDetails: {
        newRank: index + 1,
        oldRank: doc.originalRank || 'N/A',
        rerankScore: doc.rerankScore || 0,
        rankChange: doc.originalRank ? doc.originalRank - (index + 1) : 0
      }
    }));
  }

  /**
   * Generate cache key from query and document set
   */
  getCacheKey(query, documents) {
    // Create a hash based on query and first 5 document titles
    const docTitles = documents.slice(0, 5).map(d => d.title).join('|');
    return `${query.toLowerCase().trim()}_${docTitles}`;
  }

  /**
   * Check if we have quota remaining for today
   */
  hasQuota(requestCount = 1) {
    const today = new Date().toDateString();
    const quotaKey = `cohere_quota_${today}`;
    const currentQuota = parseInt(localStorage.getItem(quotaKey) || '0');

    return currentQuota + requestCount <= this.dailyLimit;
  }

  /**
   * Increment quota counter
   */
  incrementQuota(count = 1) {
    const today = new Date().toDateString();
    const quotaKey = `cohere_quota_${today}`;
    const currentQuota = parseInt(localStorage.getItem(quotaKey) || '0');
    const newQuota = currentQuota + count;

    localStorage.setItem(quotaKey, newQuota.toString());

    // Warn when approaching limit
    if (newQuota >= this.dailyLimit * 0.8) {
      console.warn(`⚠️ Cohere quota at ${((newQuota/this.dailyLimit)*100).toFixed(0)}%: ${newQuota}/${this.dailyLimit}`);
    }

    return newQuota;
  }

  /**
   * Get current quota status
   */
  getQuotaStatus() {
    const today = new Date().toDateString();
    const quotaKey = `cohere_quota_${today}`;
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
    const quotaKey = `cohere_quota_${today}`;
    localStorage.removeItem(quotaKey);
    console.log('🔄 Cohere quota reset');
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    localStorage.removeItem('cohere_rerank_cache');
    console.log('🗑️ Cohere cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      enabled: this.enabled
    };
  }

  /**
   * Batch rerank multiple query-document pairs
   * Useful for pre-computing popular searches
   */
  async batchRerank(queries) {
    const results = {};

    for (const { query, documents, topN } of queries) {
      if (!this.hasQuota()) {
        console.warn('⚠️ Cohere quota exhausted, stopping batch rerank');
        break;
      }

      try {
        results[query] = await this.rerank(query, documents, topN);
        // Rate limiting: wait 500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to rerank query "${query}":`, error);
        results[query] = documents.slice(0, topN);
      }
    }

    return results;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CohereReranker;
}
