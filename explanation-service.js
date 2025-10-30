/**
 * AI Explanation Service
 * Uses Gemini API to generate "Why this book?" explanations for search results
 *
 * Features:
 * - Match explanations (why results are relevant)
 * - Personalized reading pitches
 * - Query suggestions for refinement
 * - Smart caching (24-hour TTL)
 */

class ExplanationService {
  constructor(geminiEnhancer) {
    if (!geminiEnhancer || !geminiEnhancer.enabled) {
      console.warn('⚠️ Explanation service requires Gemini API');
      this.enabled = false;
      return;
    }

    this.gemini = geminiEnhancer;
    this.enabled = true;

    // Cache for explanations
    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

    // Load cache from localStorage
    this.loadCacheFromStorage();

    console.log('💡 Explanation service initialized');
  }

  /**
   * Load cached explanations from localStorage
   */
  loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem('explanation_cache');
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        Object.entries(data).forEach(([key, entry]) => {
          if (now - entry.timestamp < this.cacheTTL) {
            this.cache.set(key, entry);
          }
        });

        console.log(`📦 Loaded ${this.cache.size} cached explanations`);
      }
    } catch (error) {
      console.warn('Failed to load explanation cache:', error);
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
      localStorage.setItem('explanation_cache', JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to save explanation cache:', error);
    }
  }

  /**
   * Generate explanations for top search results
   *
   * @param {string} query - User's search query
   * @param {Array} results - Top search results (5-10 books)
   * @param {Object} userContext - User's reading preferences
   * @returns {Promise<Array>} Results with explanations added
   */
  async explainMatches(query, results, userContext = {}) {
    if (!this.enabled) {
      return results; // Return unchanged if service disabled
    }

    // Only explain top 5 results (most visible to users)
    const topResults = results.slice(0, 5);

    if (topResults.length === 0) {
      return results;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(query, topResults);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('🎯 Explanation cache hit');
      // Apply cached explanations to results
      return this.applyCachedExplanations(results, cached.explanations);
    }

    // Generate new explanations
    try {
      console.log(`💡 Generating explanations for ${topResults.length} results...`);
      const startTime = Date.now();

      const explanations = await this.generateExplanations(query, topResults, userContext);

      const latency = Date.now() - startTime;
      console.log(`✨ Explanations generated in ${latency}ms`);

      // Cache the results
      this.cache.set(cacheKey, {
        explanations,
        timestamp: Date.now()
      });
      this.saveCacheToStorage();

      // Apply explanations to results
      return this.applyExplanations(results, explanations);

    } catch (error) {
      console.error('❌ Failed to generate explanations:', error);
      return results; // Return unchanged on error
    }
  }

  /**
   * Generate explanations using Gemini API
   */
  async generateExplanations(query, results, userContext) {
    const prompt = this.buildExplanationPrompt(query, results, userContext);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.gemini.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.4, // Slightly creative but consistent
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Parse JSON response
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      const parsed = JSON.parse(jsonText.trim());
      return parsed.explanations || [];
    } catch (parseError) {
      console.warn('Failed to parse explanation JSON:', parseError);
      return [];
    }
  }

  /**
   * Build prompt for Gemini to generate explanations
   */
  buildExplanationPrompt(query, results, userContext) {
    const favoriteGenres = userContext.favoriteGenres?.slice(0, 3).map(g => g.genre).join(', ') || 'None';
    const favoriteAuthors = userContext.favoriteAuthors?.slice(0, 3).map(a => a.author).join(', ') || 'None';

    const booksText = results.map((book, i) => {
      const desc = book.description ? book.description.substring(0, 200) + '...' : 'No description';
      return `${i + 1}. "${book.title}" by ${book.author || 'Unknown'}
   Genre: ${book.categories?.join(', ') || book.genre || 'Unknown'}
   Description: ${desc}
   Match Score: ${(book.finalScore * 100).toFixed(0)}%`;
    }).join('\n\n');

    return `You are a book recommendation expert. Explain why these books match the user's search query.

**User Query:** "${query}"

**User's Reading Preferences:**
- Favorite Genres: ${favoriteGenres}
- Favorite Authors: ${favoriteAuthors}

**Books to Explain:**
${booksText}

**Task:** For each book, write ONE concise sentence (15-25 words) explaining why it matches the query. Focus on:
1. The specific element that makes it relevant
2. How it connects to the user's query
3. What makes it stand out

**Guidelines:**
- Be specific and informative
- Use natural, conversational language
- Reference the query explicitly when relevant
- Mention user preferences if they influenced the match
- Keep it concise but meaningful

**Output Format (JSON only):**
{
  "explanations": [
    {"bookIndex": 0, "explanation": "..."},
    {"bookIndex": 1, "explanation": "..."},
    {"bookIndex": 2, "explanation": "..."},
    {"bookIndex": 3, "explanation": "..."},
    {"bookIndex": 4, "explanation": "..."}
  ]
}

Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Apply explanations to results array
   */
  applyExplanations(results, explanations) {
    const enhanced = [...results];

    explanations.forEach(exp => {
      if (exp.bookIndex < enhanced.length) {
        enhanced[exp.bookIndex] = {
          ...enhanced[exp.bookIndex],
          matchExplanation: exp.explanation,
          hasExplanation: true
        };
      }
    });

    return enhanced;
  }

  /**
   * Apply cached explanations to results
   */
  applyCachedExplanations(results, cachedExplanations) {
    return this.applyExplanations(results, cachedExplanations);
  }

  /**
   * Generate cache key
   */
  getCacheKey(query, results) {
    const titles = results.slice(0, 3).map(r => r.title).join('|');
    return `explain_${query.toLowerCase().trim()}_${titles}`;
  }

  /**
   * Generate personalized pitch for a specific book
   * Used for detailed book views or featured recommendations
   */
  async generatePersonalizedPitch(book, userContext) {
    if (!this.enabled) {
      return null;
    }

    const cacheKey = `pitch_${book.title}_${book.author}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.pitch;
    }

    try {
      const prompt = this.buildPersonalizedPitchPrompt(book, userContext);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.gemini.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 200
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const pitch = data.candidates[0].content.parts[0].text.trim();

      // Cache the pitch
      this.cache.set(cacheKey, {
        pitch,
        timestamp: Date.now()
      });
      this.saveCacheToStorage();

      return pitch;

    } catch (error) {
      console.error('Failed to generate personalized pitch:', error);
      return null;
    }
  }

  /**
   * Build prompt for personalized pitch
   */
  buildPersonalizedPitchPrompt(book, userContext) {
    const favoriteGenres = userContext.favoriteGenres?.slice(0, 2).map(g => g.genre).join(', ') || 'various';
    const favoriteAuthors = userContext.favoriteAuthors?.slice(0, 2).map(a => a.author).join(', ') || 'various';
    const avgRating = userContext.avgRating || 'N/A';

    return `Generate a personalized reading recommendation pitch.

**Book:**
- Title: ${book.title}
- Author: ${book.author || 'Unknown'}
- Genre: ${book.categories?.join(', ') || book.genre || 'Unknown'}
- Description: ${book.description?.substring(0, 300) || 'No description available'}

**Reader Profile:**
- Favorite Genres: ${favoriteGenres}
- Favorite Authors: ${favoriteAuthors}
- Average Rating Given: ${avgRating}

**Task:** Write a compelling 2-3 sentence pitch explaining why THIS specific reader would love this book. Reference their reading preferences and connect the book's unique qualities to their tastes.

Write in second person ("you'll love..."). Be enthusiastic but authentic. Focus on what makes this book special for this reader.

Output only the pitch text, no labels or formatting.`;
  }

  /**
   * Generate query suggestions for refinement
   */
  async generateQuerySuggestions(currentQuery, results, userContext) {
    if (!this.enabled) {
      return [];
    }

    const cacheKey = `suggest_${currentQuery.toLowerCase().trim()}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.suggestions;
    }

    try {
      const prompt = `Generate search query suggestions to help refine book search results.

**Current Query:** "${currentQuery}"
**Results Found:** ${results.length} books
**User's Favorite Genres:** ${userContext.favoriteGenres?.slice(0, 3).map(g => g.genre).join(', ') || 'Various'}

**Task:** Generate 3-5 alternative search queries that would help the user find:
1. More specific versions of this search
2. Related topics or themes
3. Similar but different angles

**Guidelines:**
- Keep queries natural and conversational
- Make them actionable and specific
- Include variety (more specific, related topics, different moods)
- Ensure they're related to the original query

**Output Format (JSON only):**
{
  "suggestions": [
    "query suggestion 1",
    "query suggestion 2",
    "query suggestion 3",
    "query suggestion 4",
    "query suggestion 5"
  ]
}

Return ONLY valid JSON.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.gemini.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7, // More creative for variety
              maxOutputTokens: 200
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;

      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      const parsed = JSON.parse(jsonText.trim());
      const suggestions = parsed.suggestions || [];

      // Cache suggestions
      this.cache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });
      this.saveCacheToStorage();

      return suggestions;

    } catch (error) {
      console.error('Failed to generate query suggestions:', error);
      return [];
    }
  }

  /**
   * Clear explanation cache
   */
  clearCache() {
    this.cache.clear();
    localStorage.removeItem('explanation_cache');
    console.log('🗑️ Explanation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      enabled: this.enabled
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExplanationService;
}
