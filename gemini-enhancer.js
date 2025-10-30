/**
 * Gemini AI Query Enhancer
 * Uses Google's Gemini API (free tier: 1,500 requests/day) to enhance book search queries
 * with better semantic understanding and context-aware expansion.
 */

class GeminiEnhancer {
  constructor(apiKey) {
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.warn('⚠️ Gemini API key not configured. AI enhancement disabled.');
      this.enabled = false;
      return;
    }

    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-1.5-flash';
    this.enabled = true;

    // Cache for enhanced queries (24-hour TTL)
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

    // Load cache from localStorage
    this.loadCacheFromStorage();

    console.log('🤖 Gemini AI enhancer initialized');
  }

  /**
   * Load cached enhanced queries from localStorage
   */
  loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem('gemini_cache');
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        // Filter out expired entries
        Object.entries(data).forEach(([key, entry]) => {
          if (now - entry.timestamp < this.cacheExpiry) {
            this.cache.set(key, entry);
          }
        });

        console.log(`📦 Loaded ${this.cache.size} cached AI enhancements`);
      }
    } catch (error) {
      console.warn('Failed to load Gemini cache:', error);
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
      localStorage.setItem('gemini_cache', JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to save Gemini cache:', error);
    }
  }

  /**
   * Check if query should be enhanced by AI
   * Simple queries don't need AI enhancement (saves API quota)
   */
  shouldEnhance(query) {
    if (!this.enabled) return false;

    const words = query.trim().split(/\s+/).length;

    // Complex indicators
    const hasComparison = /like|meets|similar to|but|without|versus|vs/i.test(query);
    const hasNuance = /atmospheric|nuanced|explores|delves into|character-driven|literary/i.test(query);
    const hasMultipleThemes = /and|with|about|featuring/gi.test(query) && words > 6;
    const hasVagueTerms = /good|interesting|compelling|amazing|great book/i.test(query);

    // Enhance if:
    // - 6+ words (complex query)
    // - Contains comparison language
    // - Contains nuanced literary terms
    // - Multiple themes/requirements
    // - Vague terms that need interpretation
    return words >= 6 || hasComparison || hasNuance || hasMultipleThemes || hasVagueTerms;
  }

  /**
   * Enhance a search query using Gemini AI
   * @param {string} query - Original user query
   * @param {Object} userContext - User's reading preferences
   * @returns {Promise<Object>} Enhanced query data
   */
  async enhanceQuery(query, userContext = {}) {
    if (!this.enabled) {
      return { enhanced: false, originalQuery: query, expandedQuery: query };
    }

    // Check if enhancement is needed
    if (!this.shouldEnhance(query)) {
      console.log('⚡ Simple query, skipping AI enhancement');
      return { enhanced: false, originalQuery: query, expandedQuery: query };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(query, userContext);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('🎯 Cache hit for AI-enhanced query');
      return cached.data;
    }

    // Check daily quota
    if (!this.hasQuota()) {
      console.warn('⚠️ Gemini daily quota exhausted, using fallback');
      return { enhanced: false, originalQuery: query, expandedQuery: query };
    }

    // Call Gemini API
    try {
      console.log('🤖 Enhancing query with Gemini AI...');
      const startTime = Date.now();

      const enhancedData = await this.callGeminiAPI(query, userContext);

      const latency = Date.now() - startTime;
      console.log(`✨ Query enhanced in ${latency}ms`);

      // Update quota counter
      this.incrementQuota();

      // Cache the result
      const result = {
        enhanced: true,
        originalQuery: query,
        expandedQuery: enhancedData.expandedQuery || query,
        themes: enhancedData.themes || [],
        mood: enhancedData.mood || null,
        keyElements: enhancedData.keyElements || [],
        aiInsights: enhancedData.insights || null
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      this.saveCacheToStorage();

      return result;

    } catch (error) {
      console.error('❌ Gemini API call failed:', error);

      // Return original query as fallback
      return {
        enhanced: false,
        originalQuery: query,
        expandedQuery: query,
        error: error.message
      };
    }
  }

  /**
   * Call Gemini API with structured prompt
   */
  async callGeminiAPI(query, userContext) {
    const prompt = this.buildPrompt(query, userContext);

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent results
            maxOutputTokens: 300,
            topP: 0.8,
            topK: 40
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;

    // Parse JSON response
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      return JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response, using text as expanded query');
      return { expandedQuery: text.trim() };
    }
  }

  /**
   * Build optimized prompt for Gemini
   */
  buildPrompt(query, userContext) {
    const favoriteGenres = userContext.favoriteGenres?.slice(0, 3).join(', ') || 'None specified';
    const favoriteAuthors = userContext.favoriteAuthors?.slice(0, 3).join(', ') || 'None specified';

    return `You are an expert librarian and book recommendation assistant. Analyze this book search query and enhance it for better semantic search results.

**Original Query:** "${query}"

**User Context:**
- Favorite genres: ${favoriteGenres}
- Favorite authors: ${favoriteAuthors}

**Task:** Enhance this query by:
1. Identifying core themes and literary elements
2. Expanding with synonyms and related concepts
3. Adding relevant genre/mood descriptors
4. Incorporating user preferences when relevant

**Output Format (JSON only):**
{
  "expandedQuery": "enhanced search query with key terms and concepts (max 20 words)",
  "themes": ["theme1", "theme2", "theme3"],
  "mood": "overall emotional tone/atmosphere",
  "keyElements": ["element1", "element2"],
  "insights": "one sentence about what the user is looking for"
}

**Guidelines:**
- Keep expandedQuery concise but descriptive
- Focus on searchable terms, not full sentences
- Include specific tropes or narrative styles if mentioned
- Don't add irrelevant user preferences
- If query mentions specific books/authors, preserve those references

Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Generate cache key from query and context
   */
  getCacheKey(query, userContext) {
    const genres = userContext.favoriteGenres?.slice(0, 2).join(',') || '';
    return `${query.toLowerCase().trim()}_${genres}`;
  }

  /**
   * Check if we have quota remaining for today
   */
  hasQuota() {
    const today = new Date().toDateString();
    const quotaKey = `gemini_quota_${today}`;
    const currentQuota = parseInt(localStorage.getItem(quotaKey) || '0');

    // Leave buffer of 100 requests before hitting limit
    return currentQuota < 1400;
  }

  /**
   * Increment quota counter
   */
  incrementQuota() {
    const today = new Date().toDateString();
    const quotaKey = `gemini_quota_${today}`;
    const currentQuota = parseInt(localStorage.getItem(quotaKey) || '0');
    const newQuota = currentQuota + 1;

    localStorage.setItem(quotaKey, newQuota.toString());

    // Warn when approaching limit
    if (newQuota >= 1400) {
      console.warn(`⚠️ Gemini quota approaching limit: ${newQuota}/1500 for today`);
    }

    return newQuota;
  }

  /**
   * Get current quota status
   */
  getQuotaStatus() {
    const today = new Date().toDateString();
    const quotaKey = `gemini_quota_${today}`;
    const used = parseInt(localStorage.getItem(quotaKey) || '0');
    const limit = 1500;
    const remaining = limit - used;
    const percentage = ((used / limit) * 100).toFixed(1);

    return {
      used,
      remaining,
      limit,
      percentage,
      date: today
    };
  }

  /**
   * Reset quota (for testing or manual reset)
   */
  resetQuota() {
    const today = new Date().toDateString();
    const quotaKey = `gemini_quota_${today}`;
    localStorage.removeItem(quotaKey);
    console.log('🔄 Gemini quota reset');
  }

  /**
   * Clear all cached enhanced queries
   */
  clearCache() {
    this.cache.clear();
    localStorage.removeItem('gemini_cache');
    console.log('🗑️ Gemini cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiEnhancer;
}
