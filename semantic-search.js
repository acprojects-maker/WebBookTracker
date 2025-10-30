class SemanticSearchEngine {
  constructor() {
    this.pipeline = null;
    this.isLoading = false;
    this.isReady = false;
    this.cache = new Map();
    this.embeddingCache = null;
    this.searchAnalytics = new Map(); // Track query patterns for Phase 4
    this.commonQueries = [
      'fantasy with strong female lead',
      'sci-fi space opera',
      'mystery thriller',
      'romance contemporary',
      'young adult fantasy'
    ];
  }

  async initialize() {
    if (this.isReady) return;
    if (this.isLoading) {
      await new Promise(resolve => {
        const checkReady = setInterval(() => {
          if (this.isReady) {
            clearInterval(checkReady);
            resolve();
          }
        }, 100);
      });
      return;
    }

    this.isLoading = true;

    try {
      if (typeof window.transformers === 'undefined') {
        console.log('⏳ Waiting for Transformers.js to load...');
        await this.waitForTransformers();
      }

      console.log('🤖 Loading improved AI model (gte-small)...');
      const { pipeline } = window.transformers;

      if (!pipeline) {
        throw new Error('Pipeline function not available in transformers library');
      }

      // Using gte-small for better semantic understanding (+15% quality improvement)
      this.pipeline = await pipeline('feature-extraction', 'Xenova/gte-small');
      
      this.isReady = true;
      this.isLoading = false;
      console.log('✅ AI model loaded successfully');

      await this.initializeCache();

      // Phase 4: Pre-load common queries in background
      setTimeout(() => this.preloadCommonQueries(), 2000);

      // Phase 4: Load search analytics
      await this.loadSearchAnalytics();
    } catch (error) {
      console.error('❌ Failed to initialize AI model:', error);
      this.isLoading = false;
      throw new Error('Failed to load semantic search engine: ' + error.message);
    }
  }

  async waitForTransformers() {
    return new Promise((resolve, reject) => {
      const maxWait = 30000;
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        if (typeof window.transformers !== 'undefined') {
          clearInterval(checkInterval);
          console.log('✅ Transformers.js is now available');
          resolve();
        } else if (Date.now() - startTime > maxWait) {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for Transformers.js to load'));
        }
      }, 100);
    });
  }

  async initializeCache() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BookTrackerSemanticCache', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.embeddingCache = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('embeddings')) {
          db.createObjectStore('embeddings', { keyPath: 'text' });
        }
        if (!db.objectStoreNames.contains('searches')) {
          db.createObjectStore('searches', { keyPath: 'query' });
        }
      };
    });
  }

  async generateEmbedding(text) {
    if (!this.isReady) {
      await this.initialize();
    }

    const normalizedText = text.toLowerCase().trim();

    if (this.cache.has(normalizedText)) {
      return this.cache.get(normalizedText);
    }

    const cached = await this.getCachedEmbedding(normalizedText);
    if (cached) {
      this.cache.set(normalizedText, cached);
      return cached;
    }

    const output = await this.pipeline(normalizedText, {
      pooling: 'mean',
      normalize: true
    });

    const embedding = Array.from(output.data);

    this.cache.set(normalizedText, embedding);
    await this.cacheEmbedding(normalizedText, embedding);

    return embedding;
  }

  // Batch process multiple embeddings for better performance
  async generateEmbeddingsBatch(texts) {
    if (!this.isReady) {
      await this.initialize();
    }

    const results = [];
    const uncachedTexts = [];
    const uncachedIndices = [];

    // First pass: check cache for all texts
    for (let i = 0; i < texts.length; i++) {
      const normalized = texts[i].toLowerCase().trim();

      if (this.cache.has(normalized)) {
        results[i] = this.cache.get(normalized);
      } else {
        const cached = await this.getCachedEmbedding(normalized);
        if (cached) {
          this.cache.set(normalized, cached);
          results[i] = cached;
        } else {
          uncachedTexts.push(normalized);
          uncachedIndices.push(i);
        }
      }
    }

    // Second pass: batch process uncached texts
    if (uncachedTexts.length > 0) {
      console.log(`📦 Batch processing ${uncachedTexts.length} embeddings...`);

      // Process in chunks of 10 for optimal performance
      const chunkSize = 10;
      for (let i = 0; i < uncachedTexts.length; i += chunkSize) {
        const chunk = uncachedTexts.slice(i, i + chunkSize);
        const chunkIndices = uncachedIndices.slice(i, i + chunkSize);

        // Process chunk in parallel
        const embeddings = await Promise.all(
          chunk.map(async (text) => {
            const output = await this.pipeline(text, {
              pooling: 'mean',
              normalize: true
            });
            return Array.from(output.data);
          })
        );

        // Store results and cache
        for (let j = 0; j < chunk.length; j++) {
          const embedding = embeddings[j];
          const text = chunk[j];
          const originalIndex = chunkIndices[j];

          results[originalIndex] = embedding;
          this.cache.set(text, embedding);
          await this.cacheEmbedding(text, embedding);
        }
      }
    }

    return results;
  }

  async getCachedEmbedding(text) {
    if (!this.embeddingCache) return null;

    return new Promise((resolve) => {
      const transaction = this.embeddingCache.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      const request = store.get(text);

      request.onsuccess = () => {
        resolve(request.result?.embedding || null);
      };
      request.onerror = () => resolve(null);
    });
  }

  async cacheEmbedding(text, embedding) {
    if (!this.embeddingCache) return;

    const transaction = this.embeddingCache.transaction(['embeddings'], 'readwrite');
    const store = transaction.objectStore('embeddings');
    store.put({ text, embedding, timestamp: Date.now() });
  }

  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Enhanced fuzzy matching for common misspellings and variants
  fuzzyMatch(text, patterns) {
    const textLower = text.toLowerCase();
    return patterns.some(pattern => {
      if (typeof pattern === 'string') {
        return textLower.includes(pattern.toLowerCase());
      }
      return pattern.test(text);
    });
  }

  // Parse compound queries with OR/AND logic
  parseCompoundQuery(query) {
    const parts = {
      required: [],
      optional: [],
      excluded: []
    };

    // Handle "NOT" or "without" for exclusions
    const exclusionPattern = /(?:not|without|no)\s+([a-z\s]+?)(?:\s+(?:and|or|but)|$)/gi;
    let match;
    while ((match = exclusionPattern.exec(query)) !== null) {
      parts.excluded.push(match[1].trim());
    }

    // Handle "OR" for optional terms
    const orPattern = /([^|]+?)(?:\s+or\s+|\|)([^|]+)/gi;
    if (orPattern.test(query)) {
      query.split(/\s+or\s+|\|/i).forEach(part => {
        parts.optional.push(part.trim());
      });
    } else {
      parts.required.push(query);
    }

    return parts;
  }

  // Detect comparison queries ("X meets Y", "like X but Y")
  detectComparisonQuery(query) {
    // Pattern 1: "X meets Y"
    const meetsPattern = /(.+?)\s+meets\s+(.+?)(?:\s|$)/i;
    const meetsMatch = query.match(meetsPattern);
    if (meetsMatch) {
      return {
        isComparison: true,
        type: 'meets',
        references: [meetsMatch[1].trim(), meetsMatch[2].trim()]
      };
    }

    // Pattern 2: "like X but Y"
    const likeButPattern = /like\s+(.+?)\s+but\s+(.+?)(?:\s|$)/i;
    const likeButMatch = query.match(likeButPattern);
    if (likeButMatch) {
      return {
        isComparison: true,
        type: 'like-but',
        reference: likeButMatch[1].trim(),
        modifier: likeButMatch[2].trim()
      };
    }

    // Pattern 3: "X for Y" (e.g., "Harry Potter for adults")
    const forPattern = /(.+?)\s+for\s+(adults?|teens?|kids?|children|young\s+adults?)/i;
    const forMatch = query.match(forPattern);
    if (forMatch) {
      return {
        isComparison: true,
        type: 'for-audience',
        reference: forMatch[1].trim(),
        audience: forMatch[2].trim()
      };
    }

    return { isComparison: false };
  }

  // Detect popular tropes
  detectTropes(query) {
    const tropes = [];

    const tropePatterns = {
      'enemies-to-lovers': /enemies\s+to\s+lovers|enemies\s+become\s+lovers/i,
      'found-family': /found\s+family|chosen\s+family/i,
      'slow-burn': /slow\s+burn|slow\s+romance/i,
      'love-triangle': /love\s+triangle/i,
      'chosen-one': /chosen\s+one|the\s+one|prophecy/i,
      'mentor-dies': /mentor\s+dies|dead\s+mentor/i,
      'redemption-arc': /redemption\s+arc|villain\s+becomes\s+hero/i,
      'second-chance': /second\s+chance\s+romance/i,
      'fake-dating': /fake\s+dating|fake\s+relationship|pretend\s+relationship/i,
      'forced-proximity': /forced\s+proximity|stuck\s+together/i,
      'grumpy-sunshine': /grumpy\s+sunshine|opposites\s+attract/i,
      'time-travel': /time\s+travel|time\s+loop/i,
      'underdog': /underdog|rags\s+to\s+riches/i,
      'reluctant-hero': /reluctant\s+hero/i
    };

    Object.entries(tropePatterns).forEach(([trope, pattern]) => {
      if (pattern.test(query)) {
        tropes.push(trope);
      }
    });

    return tropes;
  }

  // Detect compound/multi-intent genres (e.g., "romantic mystery", "sci-fi thriller")
  detectCompoundGenres(query) {
    const detectedGenres = [];

    // Compound patterns - order matters (most specific first)
    const compoundPatterns = {
      'romantic mystery': /romantic?\s+mystery|mystery\s+romance/i,
      'sci-fi thriller': /sci-?fi\s+thriller|science\s+fiction\s+thriller/i,
      'romantic fantasy': /romantic?\s+fantasy|fantasy\s+romance/i,
      'historical mystery': /historical\s+mystery/i,
      'cozy mystery': /cozy\s+mystery/i,
      'urban fantasy': /urban\s+fantasy/i,
      'space opera': /space\s+opera/i,
      'hard sci-fi': /hard\s+sci-?fi|hard\s+science\s+fiction/i,
      'dark fantasy': /dark\s+fantasy/i,
      'epic fantasy': /epic\s+fantasy/i,
      'paranormal romance': /paranormal\s+romance/i,
      'psychological thriller': /psychological\s+thriller/i,
      'domestic thriller': /domestic\s+thriller/i,
      'literary fiction': /literary\s+fiction/i
    };

    Object.entries(compoundPatterns).forEach(([genre, pattern]) => {
      if (pattern.test(query)) {
        detectedGenres.push(genre);
      }
    });

    return detectedGenres;
  }

  async analyzeIntent(query) {
    const queryLower = query.toLowerCase();
    const compoundQuery = this.parseCompoundQuery(query);

    // Detect comparison queries
    const comparisonInfo = this.detectComparisonQuery(query);

    // Detect series-related queries
    const seriesInfo = this.detectSeriesIntent(query);

    // Detect tropes
    const tropes = this.detectTropes(query);

    // Detect compound genres first (before simple genres)
    const compoundGenres = this.detectCompoundGenres(query);

    // Detect awards/accolades
    const awards = [];
    const awardPatterns = {
      'pulitzer': /pulitzer/i,
      'hugo': /hugo/i,
      'nebula': /nebula/i,
      'man-booker': /man\s+booker|booker\s+prize/i,
      'national-book': /national\s+book\s+award/i,
      'newbery': /newbery/i,
      'caldecott': /caldecott/i,
      'edgar': /edgar\s+award/i,
      'bestseller': /bestseller|best\s+seller|new\s+york\s+times/i,
      'award-winning': /award[\s-]winning|prize[\s-]winning/i
    };

    Object.entries(awardPatterns).forEach(([award, pattern]) => {
      if (pattern.test(query)) {
        awards.push(award);
      }
    });

    // Detect temporal context
    let temporalContext = null;
    if (/\b(recent|new|latest|modern|current|contemporary|2020s?|202[0-9])\b/i.test(query)) {
      temporalContext = 'recent';
    } else if (/\b(classic|old|vintage|timeless|traditional|19[0-9]{2}s?)\b/i.test(query)) {
      temporalContext = 'classic';
    }

    // Detect book format preferences (novel vs collection vs anthology, etc.)
    const formatPreference = this.detectFormatPreference(query);

    const fictionIndicators = [
      'novel', 'story', 'book', 'fiction', 'series', 'character',
      'protagonist', 'hero', 'heroine', 'lead', 'plot', 'narrative',
      'tale', 'saga', /\b(?:reading|read)\b/
    ];
    const wantsFiction = this.fuzzyMatch(query, fictionIndicators) ||
                         !queryLower.includes('review') &&
                         !queryLower.includes('analysis') &&
                         !queryLower.includes('study') &&
                         !queryLower.includes('paper');

    
    const characterPatterns = {
      'strong female lead': /strong (female|woman|girl) (lead|protagonist|character|hero)/i,
      'male protagonist': /male (lead|protagonist|character|hero)/i,
      'diverse cast': /diverse|multicultural|representation/i,
      'lgbtq': /lgbtq|lgbt|queer|gay|lesbian/i,
      'ensemble cast': /ensemble|multiple (characters|protagonists)/i
    };

    const characterRequirements = [];
    Object.entries(characterPatterns).forEach(([req, pattern]) => {
      if (pattern.test(query)) {
        characterRequirements.push(req);
      }
    });

    const moodKeywords = {
      uplifting: ['uplifting', 'inspiring', 'hopeful', 'positive', 'happy', 'joyful', 'feel-good'],
      dark: ['dark', 'gritty', 'noir', 'grim', 'depressing', 'bleak'],
      emotional: ['emotional', 'moving', 'touching', 'heartfelt', 'poignant', 'tearjerker'],
      funny: ['funny', 'humorous', 'comedy', 'hilarious', 'witty', 'amusing', 'lighthearted'],
      thrilling: ['thrilling', 'suspenseful', 'gripping', 'tense', 'intense', 'edge-of-your-seat']
    };

    const mood = Object.keys(moodKeywords).find(m =>
      moodKeywords[m].some(keyword => queryLower.includes(keyword))
    ) || null;

    const genreKeywords = {
      'science fiction': ['sci-fi', 'science fiction', 'space opera', 'cyberpunk', 'dystopian'],
      'fantasy': ['fantasy', 'magic', 'wizard', 'dragon', 'medieval', 'quest', 'epic fantasy'],
      'mystery': ['mystery', 'detective', 'crime', 'murder', 'investigation', 'whodunit'],
      'thriller': ['thriller', 'suspense', 'conspiracy', 'spy'],
      'romance': ['romance', 'love story', 'romantic'],
      'historical': ['historical fiction', 'period drama'],
      'horror': ['horror', 'scary', 'terrifying', 'supernatural'],
      'contemporary': ['contemporary', 'modern', 'realistic'],
      'young adult': ['ya ', 'young adult', 'teen']
    };

    const genres = Object.keys(genreKeywords).filter(g =>
      genreKeywords[g].some(keyword => queryLower.includes(keyword))
    );

    // Merge compound genres with simple genres (compound genres take priority)
    const allGenres = [...compoundGenres, ...genres.filter(g =>
      !compoundGenres.some(cg => cg.includes(g))
    )];

    const themes = [];
    const themePatterns = [
      { pattern: /survival|perseverance|overcoming/i, theme: 'survival' },
      { pattern: /friendship|friends|companion/i, theme: 'friendship' },
      { pattern: /family|parent|child/i, theme: 'family' },
      { pattern: /war|battle|conflict/i, theme: 'war' },
      { pattern: /love|romance|relationship/i, theme: 'love' },
      { pattern: /adventure|journey|quest/i, theme: 'adventure' },
      { pattern: /character-driven|character focused/i, theme: 'character-driven' },
      { pattern: /magic|magical/i, theme: 'magic' },
      { pattern: /revenge|vengeance/i, theme: 'revenge' },
      { pattern: /coming of age|growing up/i, theme: 'coming-of-age' }
    ];

    themePatterns.forEach(({ pattern, theme }) => {
      if (pattern.test(query)) {
        themes.push(theme);
      }
    });

    const likeMatch = query.match(/like ["']?([^"']+)["']?/i);
    const similarTo = likeMatch ? likeMatch[1].trim() : null;

    const complexity = queryLower.includes('simple') || queryLower.includes('easy') ? 'simple' :
                      queryLower.includes('complex') || queryLower.includes('deep') ? 'complex' :
                      'medium';

    // Extract sentiment/preference signals
    const sentiment = this.analyzeSentiment(query);

    // Detect reading pace preference
    const pacePreference = this.detectPacePreference(query);

    return {
      originalQuery: query,
      compoundQuery, // Include parsed compound query structure
      genres: allGenres.length > 0 ? allGenres : ['general'],
      primaryGenre: allGenres[0] || 'fiction',
      mood,
      themes,
      tropes, // Detected tropes
      awards, // Award/accolade requirements
      temporalContext, // Recent vs. classic preference
      formatPreference, // Novel vs collection vs series preference
      characterRequirements,
      wantsFiction,
      similarTo,
      complexity,
      sentiment,
      pacePreference,
      excludedTerms: compoundQuery.excluded, // Terms to avoid
      seriesInfo, // Series-related search intent
      comparisonInfo, // Comparison query detection
      embedding: await this.generateEmbedding(query)
    };
  }

  // Analyze sentiment from query to understand emotional preference
  analyzeSentiment(query) {
    const queryLower = query.toLowerCase();

    const positiveWords = ['uplifting', 'happy', 'joyful', 'inspiring', 'hopeful', 'feel-good', 'cheerful', 'optimistic'];
    const negativeWords = ['dark', 'sad', 'depressing', 'tragic', 'grim', 'melancholy', 'bleak', 'somber'];
    const neutralWords = ['realistic', 'balanced', 'thought-provoking', 'nuanced'];

    const positiveCount = positiveWords.filter(w => queryLower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => queryLower.includes(w)).length;
    const neutralCount = neutralWords.filter(w => queryLower.includes(w)).length;

    if (positiveCount > negativeCount && positiveCount > 0) return 'positive';
    if (negativeCount > positiveCount && negativeCount > 0) return 'negative';
    if (neutralCount > 0) return 'neutral';
    return null;
  }

  // Detect reading pace preference
  detectPacePreference(query) {
    if (/fast[-\s]paced|action[-\s]packed|thriller|page[-\s]turner|quick[-\s]read|gripping/i.test(query)) {
      return 'fast';
    }
    if (/slow[-\s]burn|literary|contemplative|meditative|character[-\s]driven/i.test(query)) {
      return 'slow';
    }
    return 'any';
  }

  // Detect book format preference (novel vs collection vs anthology, etc.)
  detectFormatPreference(query) {
    const formatInfo = {
      type: null,
      wantsStandalone: false,
      wantsSeries: false,
      avoidCollections: false,
      explicitFormat: null
    };

    // Explicit novel indicators
    const novelPatterns = [
      /\b(full[\s-]length\s+)?novel\b/i,
      /\bsingle\s+story\b/i,
      /\bone\s+continuous\s+story\b/i,
      /\bcomplete\s+story\b/i,
      /\bnarrative\b/i
    ];

    // Collection/anthology indicators
    const collectionPatterns = [
      /\bcollection\b/i,
      /\banthology\b/i,
      /\bshort\s+stories\b/i,
      /\bcompilation\b/i,
      /\bgathered\s+stories\b/i,
      /\bmultiple\s+stories\b/i,
      /\bstory\s+collection\b/i
    ];

    // Standalone vs series indicators
    const standalonePatterns = [
      /\bstandalone\b/i,
      /\bone[\s-]off\b/i,
      /\bsingle\s+book\b/i,
      /\bnot\s+a\s+series\b/i,
      /\bno\s+series\b/i,
      /\bcomplete\s+in\s+one\b/i,
      /\bself[\s-]contained\b/i
    ];

    const seriesPatterns = [
      /\bseries\b/i,
      /\btrilogy\b/i,
      /\bsaga\b/i,
      /\bmulti[\s-]book\b/i,
      /\bbook\s+series\b/i,
      /\bongoing\b/i
    ];

    // Other format types
    const graphicNovelPattern = /\bgraphic\s+novel\b/i;
    const novellaPattern = /\bnovella\b/i;

    // Check for explicit novel preference
    if (novelPatterns.some(p => p.test(query))) {
      formatInfo.type = 'novel';
      formatInfo.avoidCollections = true;
      formatInfo.explicitFormat = 'full-length novel';
    }

    // Check for collection preference
    if (collectionPatterns.some(p => p.test(query))) {
      formatInfo.type = 'collection';
      formatInfo.explicitFormat = 'short story collection or anthology';
    }

    // Check for standalone preference
    if (standalonePatterns.some(p => p.test(query))) {
      formatInfo.wantsStandalone = true;
      formatInfo.wantsSeries = false;
    }

    // Check for series preference
    if (seriesPatterns.some(p => p.test(query))) {
      formatInfo.wantsSeries = true;
      formatInfo.wantsStandalone = false;
    }

    // Check for other formats
    if (graphicNovelPattern.test(query)) {
      formatInfo.type = 'graphic-novel';
      formatInfo.explicitFormat = 'graphic novel';
    }

    if (novellaPattern.test(query)) {
      formatInfo.type = 'novella';
      formatInfo.explicitFormat = 'novella';
    }

    // Detect anti-patterns (what user wants to avoid)
    if (/\bno\s+anthology\b|\bnot\s+a\s+collection\b|\bavoid\s+anthologies\b/i.test(query)) {
      formatInfo.avoidCollections = true;
    }

    // Default behavior: prefer novels unless explicitly requesting collections
    // This handles "books", no format specification, or just "novel"
    if (!formatInfo.type) {
      // If user explicitly wants collections/anthologies, they would have said so above
      // Otherwise, default to novels (most common request - people usually want full stories)
      formatInfo.type = 'novel';
      formatInfo.avoidCollections = true;
      formatInfo.explicitFormat = 'novel (default)';
      console.log('📚 No format specified, defaulting to novels (filtering out collections)');
    }

    return formatInfo;
  }

  // Detect series-related intent
  detectSeriesIntent(query) {
    // Pattern 1: "book 2", "book two", "second book"
    const bookNumberPattern = /(?:book|volume|vol\.?|part)\s*(?:#)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth)/i;
    const bookNumberMatch = query.match(bookNumberPattern);

    // Pattern 2: "sequel to", "next in series", "follows"
    const sequelPatterns = [
      /sequel\s+(?:to|of)\s+["']?([^"']+)["']?/i,
      /(?:next|second|third)\s+(?:book\s+)?(?:in|after)\s+["']?([^"']+)["']?/i,
      /(?:follows|continuation\s+of)\s+["']?([^"']+)["']?/i
    ];

    let sequelTo = null;
    for (const pattern of sequelPatterns) {
      const match = query.match(pattern);
      if (match) {
        sequelTo = match[1].trim();
        break;
      }
    }

    // Pattern 3: Series name mentions
    const seriesPattern = /(.+?)\s+(?:series|trilogy|saga|cycle)/i;
    const seriesMatch = query.match(seriesPattern);

    // Pattern 4: "first in series", "start of series"
    const firstInSeries = /(?:first|start|beginning)\s+(?:book\s+)?(?:in|of)\s+(?:the\s+)?(?:series|trilogy)/i.test(query);

    return {
      isSeries: !!(bookNumberMatch || sequelTo || seriesMatch || firstInSeries),
      bookNumber: bookNumberMatch ? this.parseBookNumber(bookNumberMatch[1]) : null,
      sequelTo,
      seriesName: seriesMatch ? seriesMatch[1].trim() : null,
      wantsFirst: firstInSeries
    };
  }

  // Helper: Parse book number from text
  parseBookNumber(numberText) {
    const numberMap = {
      'one': 1, 'first': 1,
      'two': 2, 'second': 2,
      'three': 3, 'third': 3,
      'four': 4, 'fourth': 4,
      'five': 5, 'fifth': 5,
      'six': 6, 'sixth': 6,
      'seven': 7, 'seventh': 7,
      'eight': 8, 'eighth': 8,
      'nine': 9, 'ninth': 9,
      'ten': 10, 'tenth': 10
    };

    const lower = numberText.toLowerCase();
    return numberMap[lower] || parseInt(numberText) || null;
  }

  async getUserContext() {
    try {
      const books = await api.getBooks();
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

      // Separate books by rating with time-decay
      const favoriteBooks = books.filter(b => b.rating >= 4);
      const recentFavorites = favoriteBooks.filter(b => {
        const bookDate = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bookDate > thirtyDaysAgo;
      });
      const dislikedBooks = books.filter(b => b.rating <= 2);

      // Calculate author preferences with recency weighting
      const authorCounts = {};
      const authorRecencyScores = {};
      favoriteBooks.forEach(book => {
        const bookDate = book.updated_at ? new Date(book.updated_at).getTime() : ninetyDaysAgo;
        const recencyWeight = bookDate > thirtyDaysAgo ? 2.0 : bookDate > ninetyDaysAgo ? 1.5 : 1.0;

        authorCounts[book.author] = (authorCounts[book.author] || 0) + 1;
        authorRecencyScores[book.author] = (authorRecencyScores[book.author] || 0) + (book.rating * recencyWeight);
      });

      const favoriteAuthors = Object.entries(authorRecencyScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([author]) => author);

      // Track disliked authors for negative signals
      const dislikedAuthors = {};
      dislikedBooks.forEach(book => {
        dislikedAuthors[book.author] = (dislikedAuthors[book.author] || 0) + 1;
      });
      const avoidAuthors = Object.entries(dislikedAuthors)
        .filter(([_, count]) => count >= 2) // Only if 2+ books disliked
        .map(([author]) => author);

      // Genre preferences with recency weighting
      const genreCounts = {};
      const genreRecencyScores = {};
      favoriteBooks.forEach(book => {
        if (book.genre && book.genre !== 'Unknown') {
          const bookDate = book.updated_at ? new Date(book.updated_at).getTime() : ninetyDaysAgo;
          const recencyWeight = bookDate > thirtyDaysAgo ? 2.0 : bookDate > ninetyDaysAgo ? 1.5 : 1.0;

          genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
          genreRecencyScores[book.genre] = (genreRecencyScores[book.genre] || 0) + (book.rating * recencyWeight);
        }
      });

      const favoriteGenres = Object.entries(genreRecencyScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      // Disliked genres
      const dislikedGenres = {};
      dislikedBooks.forEach(book => {
        if (book.genre && book.genre !== 'Unknown') {
          dislikedGenres[book.genre] = (dislikedGenres[book.genre] || 0) + 1;
        }
      });
      const avoidGenres = Object.entries(dislikedGenres)
        .filter(([_, count]) => count >= 2)
        .map(([genre]) => genre);

      // Prioritize recent favorites but include all-time favorites
      const topFavorites = [
        ...recentFavorites.slice(0, 5),
        ...favoriteBooks.filter(b => !recentFavorites.includes(b)).slice(0, 5)
      ].slice(0, 10);

      const favoriteEmbeddings = await Promise.all(
        topFavorites.map(async book => {
          const bookDate = book.updated_at ? new Date(book.updated_at).getTime() : ninetyDaysAgo;
          const recencyWeight = bookDate > thirtyDaysAgo ? 1.3 : bookDate > ninetyDaysAgo ? 1.15 : 1.0;

          return {
            title: book.title,
            author: book.author,
            rating: book.rating,
            recencyWeight,
            embedding: await this.generateEmbedding(`${book.title} by ${book.author}`)
          };
        })
      );

      // Calculate reading pace preference from completed books
      const finishedBooks = books.filter(b => b.status === 'Finished');
      const avgPages = finishedBooks.length > 0
        ? finishedBooks.reduce((sum, b) => sum + (b.pages || 0), 0) / finishedBooks.length
        : 0;

      // Analyze completion rate by book length to recommend appropriate sizes
      const currentlyReading = books.filter(b => b.status === 'Currently Reading');
      const allStartedBooks = [...finishedBooks, ...currentlyReading];

      const lengthCategories = {
        short: { range: [0, 250], finished: 0, started: 0 },
        medium: { range: [251, 400], finished: 0, started: 0 },
        long: { range: [401, 600], finished: 0, started: 0 },
        epic: { range: [601, Infinity], finished: 0, started: 0 }
      };

      allStartedBooks.forEach(book => {
        if (!book.pages) return;

        const category = book.pages <= 250 ? 'short' :
                        book.pages <= 400 ? 'medium' :
                        book.pages <= 600 ? 'long' : 'epic';

        lengthCategories[category].started++;
        if (book.status === 'Finished') {
          lengthCategories[category].finished++;
        }
      });

      // Calculate completion rates for each category
      const completionRates = {};
      Object.keys(lengthCategories).forEach(cat => {
        const { finished, started } = lengthCategories[cat];
        completionRates[cat] = started > 0 ? finished / started : 0;
      });

      // Find preferred length category (highest completion rate with minimum 3 books)
      const preferredLength = Object.entries(completionRates)
        .filter(([cat]) => lengthCategories[cat].started >= 3)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        totalBooks: books.length,
        finishedBooks: finishedBooks.length,
        favoriteAuthors,
        favoriteGenres,
        favoriteEmbeddings,
        avoidAuthors,        // New: Authors to de-prioritize
        avoidGenres,         // New: Genres to de-prioritize
        recentFavorites: recentFavorites.length,
        avgBookLength: avgPages,
        completionRates,     // New: Completion rates by length category
        preferredLength,     // New: Category with best completion rate
        hasHistory: books.length > 0
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        totalBooks: 0,
        finishedBooks: 0,
        favoriteAuthors: [],
        favoriteGenres: [],
        favoriteEmbeddings: [],
        avoidAuthors: [],
        avoidGenres: [],
        recentFavorites: 0,
        avgBookLength: 0,
        completionRates: {},
        preferredLength: null,
        hasHistory: false
      };
    }
  }

  buildSearchStrategies(intent, userContext = null) {
    const strategies = [];

    // 1. Direct query (always highest priority)
    const directQuery = intent.wantsFiction && !intent.originalQuery.includes('novel') && !intent.originalQuery.includes('fiction')
      ? `${intent.originalQuery} fiction novel`
      : intent.originalQuery;

    strategies.push({
      type: 'direct',
      query: directQuery,
      weight: 1.0,
      description: 'Direct search'
    });

    // 2. Series-specific strategy (very high priority when detected)
    if (intent.seriesInfo && intent.seriesInfo.isSeries) {
      const seriesInfo = intent.seriesInfo;

      // Case 1: Looking for a specific book number in a series
      if (seriesInfo.bookNumber && seriesInfo.seriesName) {
        strategies.push({
          type: 'series-number',
          query: `${seriesInfo.seriesName} book ${seriesInfo.bookNumber}`,
          weight: 0.98,
          description: `Book ${seriesInfo.bookNumber} in ${seriesInfo.seriesName} series`
        });
      }

      // Case 2: Looking for a sequel to a specific book
      if (seriesInfo.sequelTo) {
        strategies.push({
          type: 'series-sequel',
          query: `sequel to ${seriesInfo.sequelTo} next book`,
          weight: 0.97,
          description: `Sequel to "${seriesInfo.sequelTo}"`
        });
      }

      // Case 3: Looking for first book in a series
      if (seriesInfo.wantsFirst && seriesInfo.seriesName) {
        strategies.push({
          type: 'series-first',
          query: `${seriesInfo.seriesName} first book series`,
          weight: 0.97,
          description: `First book in ${seriesInfo.seriesName} series`
        });
      } else if (seriesInfo.wantsFirst) {
        strategies.push({
          type: 'series-first',
          query: `${intent.originalQuery} first book`,
          weight: 0.95,
          description: 'First book in series'
        });
      }

      // Case 4: General series search
      if (seriesInfo.seriesName && !seriesInfo.bookNumber && !seriesInfo.wantsFirst) {
        strategies.push({
          type: 'series-general',
          query: `${seriesInfo.seriesName} series books`,
          weight: 0.96,
          description: `${seriesInfo.seriesName} series`
        });
      }
    }

    // 3. Character-focused strategy (high priority)
    if (intent.characterRequirements.length > 0 && intent.primaryGenre !== 'general') {
      const charQuery = `${intent.primaryGenre} ${intent.mood || ''} ${intent.characterRequirements[0].replace(/-/g, ' ')} fiction novel`.trim();
      strategies.push({
        type: 'character',
        query: charQuery,
        weight: 0.95,
        description: 'Character-focused search'
      });
    }

    // 3. Comparison query strategies (X meets Y, like X but Y)
    if (intent.comparisonInfo && intent.comparisonInfo.isComparison) {
      const comp = intent.comparisonInfo;

      if (comp.type === 'meets') {
        // "X meets Y" - blend both references
        strategies.push({
          type: 'comparison-meets',
          query: `${comp.references[0]} ${comp.references[1]} similar blend`,
          weight: 0.96,
          description: `Blending ${comp.references[0]} and ${comp.references[1]}`
        });

        // Add individual searches for each reference
        comp.references.forEach((ref, i) => {
          strategies.push({
            type: 'comparison-ref',
            query: `${ref} ${intent.primaryGenre}`,
            weight: 0.88 - (i * 0.02),
            description: `Like ${ref}`
          });
        });
      } else if (comp.type === 'like-but') {
        // "like X but Y" - X as base, Y as modifier
        strategies.push({
          type: 'comparison-modified',
          query: `${comp.reference} ${comp.modifier} ${intent.primaryGenre}`,
          weight: 0.96,
          description: `${comp.reference} with ${comp.modifier}`
        });
      } else if (comp.type === 'for-audience') {
        // "X for Y" - adjust maturity/complexity
        const audienceModifier = comp.audience.includes('adult') ? 'mature complex' :
                                comp.audience.includes('teen') ? 'young adult' : 'middle grade';
        strategies.push({
          type: 'comparison-audience',
          query: `${comp.reference} ${audienceModifier}`,
          weight: 0.95,
          description: `${comp.reference} for ${comp.audience}`
        });
      }
    }

    // 4. Similar-to strategy (when user references specific book)
    if (intent.similarTo) {
      strategies.push({
        type: 'similar',
        query: `${intent.similarTo} ${intent.primaryGenre} novel`,
        weight: 0.95,
        description: `Similar to "${intent.similarTo}"`
      });

      // Add author-based strategy if available
      strategies.push({
        type: 'similar-author',
        query: `${intent.similarTo} author similar books`,
        weight: 0.85,
        description: `Books by similar authors`
      });
    }

    // 4. Genre + theme combination
    if (intent.primaryGenre !== 'general' || intent.themes.length > 0) {
      const keywords = [
        intent.primaryGenre !== 'general' ? intent.primaryGenre : '',
        intent.mood || '',
        ...intent.themes.slice(0, 2)
      ].filter(Boolean).join(' ');

      if (keywords) {
        strategies.push({
          type: 'enhanced',
          query: `${keywords} fiction novel`,
          weight: 0.90,
          description: 'Genre & theme search'
        });
      }
    }

    // 5. User-preference strategy (use their favorite genres)
    if (userContext && userContext.hasHistory && userContext.favoriteGenres.length > 0) {
      const userGenres = userContext.favoriteGenres.slice(0, 2).join(' ');
      const userQuery = `${userGenres} ${intent.mood || ''} ${intent.themes[0] || ''}`.trim();

      if (userQuery && !strategies.some(s => s.query.includes(userGenres))) {
        strategies.push({
          type: 'personalized',
          query: userQuery + ' fiction',
          weight: 0.80,
          description: 'Based on your favorites'
        });
      }
    }

    // 6. Expanded synonym query
    const expandedQuery = this.expandQueryWithSynonyms(intent);
    if (expandedQuery !== intent.originalQuery && expandedQuery.length > intent.originalQuery.length + 5) {
      strategies.push({
        type: 'expanded',
        query: expandedQuery,
        weight: 0.85,
        description: 'Expanded semantic search'
      });
    }

    // 7. Acclaimed books in genre
    if (intent.primaryGenre !== 'general') {
      strategies.push({
        type: 'acclaimed',
        query: `best ${intent.primaryGenre} books award winning`,
        weight: 0.70,
        description: `Acclaimed ${intent.primaryGenre}`
      });
    }

    // 8. Discovery/fallback strategy
    if (strategies.length < 5) {
      strategies.push({
        type: 'discovery',
        query: `highly rated ${intent.originalQuery}`,
        weight: 0.65,
        description: 'Highly rated discovery'
      });
    }

    console.log(`🎯 Created ${strategies.length} focused search strategies`);
    return strategies;
  }

  expandQueryWithSynonyms(intent) {
    const synonymMap = {
      
      'sci-fi': ['science fiction', 'speculative', 'futuristic', 'space opera'],
      'science fiction': ['sci-fi', 'speculative', 'technological'],
      'fantasy': ['epic fantasy', 'magical', 'sword and sorcery', 'high fantasy'],
      'mystery': ['detective', 'whodunit', 'crime', 'thriller'],
      'thriller': ['suspense', 'gripping', 'tense', 'psychological'],
      'romance': ['love story', 'romantic', 'relationship'],
      'horror': ['scary', 'terrifying', 'supernatural', 'dark'],
      'historical': ['period', 'historical fiction', 'era'],
      'biography': ['memoir', 'life story', 'autobiography'],

      
      'funny': ['humorous', 'comedy', 'witty', 'amusing', 'lighthearted'],
      'dark': ['noir', 'gritty', 'atmospheric', 'brooding', 'bleak'],
      'emotional': ['moving', 'touching', 'heartfelt', 'poignant', 'tearjerker'],
      'uplifting': ['inspiring', 'hopeful', 'positive', 'heartwarming', 'feel-good'],
      'sad': ['melancholy', 'depressing', 'tragic', 'heartbreaking'],
      'intense': ['gripping', 'powerful', 'visceral', 'raw'],

      
      'character-driven': ['character study', 'literary', 'introspective', 'psychological'],
      'action': ['fast-paced', 'adventure', 'exciting', 'dynamic'],
      'philosophical': ['thought-provoking', 'intellectual', 'contemplative'],
      'dystopian': ['post-apocalyptic', 'futuristic', 'bleak future'],

      
      'literary': ['literary fiction', 'sophisticated', 'artful', 'prose-driven'],
      'fast-paced': ['quick', 'page-turner', 'action-packed', 'exciting'],
      'slow-burn': ['gradual', 'deliberate', 'atmospheric']
    };

    let expanded = intent.originalQuery;
    const addedTerms = new Set();

    
    if (intent.mood && synonymMap[intent.mood.toLowerCase()]) {
      const syn = synonymMap[intent.mood.toLowerCase()][0];
      if (!expanded.toLowerCase().includes(syn.toLowerCase())) {
        expanded += ' ' + syn;
        addedTerms.add(syn);
      }
    }

    
    if (intent.primaryGenre !== 'general') {
      const genreLower = intent.primaryGenre.toLowerCase();
      if (synonymMap[genreLower]) {
        const syn = synonymMap[genreLower][0];
        if (!expanded.toLowerCase().includes(syn.toLowerCase()) && !addedTerms.has(syn)) {
          expanded += ' ' + syn;
          addedTerms.add(syn);
        }
      }
    }

    
    if (intent.themes.length > 0) {
      const theme = intent.themes[0].toLowerCase();
      if (synonymMap[theme]) {
        const syn = synonymMap[theme][0];
        if (!expanded.toLowerCase().includes(syn.toLowerCase()) && !addedTerms.has(syn)) {
          expanded += ' ' + syn;
        }
      }
    }

    return expanded.trim();
  }

  async executeSearches(strategies) {
    const results = await Promise.all(
      strategies.map(async (strategy) => {
        try {
          console.log(`🔍 Executing strategy: ${strategy.description} - "${strategy.query}"`);
          const books = await api.searchBooks(strategy.query);
          console.log(`   ✓ Found ${books.length} books`);
          return books.map(book => ({
            ...book,
            sourceWeight: strategy.weight,
            sourceType: strategy.type,
            sourceDescription: strategy.description
          }));
        } catch (error) {
          console.warn(`   ✗ Strategy "${strategy.type}" failed:`, error.message);
          return [];
        }
      })
    );

    const allBooks = results.flat();
    console.log(`📚 Total books found (before dedup): ${allBooks.length}`);
    const deduped = this.deduplicateResults(allBooks);
    console.log(`📚 Unique books: ${deduped.length}`);
    return deduped;
  }

  
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  
  stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  
  normalizeTitle(title) {
    if (!title) return '';

    return title
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, '') 
      .replace(/[:\-–—,\.;!?'"()[\]{}]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Helper: Normalize author name
  normalizeAuthor(author) {
    if (!author) return '';

    let normalized = author
      .toLowerCase()
      .replace(/[\.]/g, '') // Remove periods
      .replace(/\s+/g, ' ')
      .trim();

    // Handle "LastName, FirstName" format → "FirstName LastName"
    if (normalized.includes(',')) {
      const parts = normalized.split(',').map(p => p.trim());
      if (parts.length === 2) {
        // Reverse: "LastName, FirstName" → "FirstName LastName"
        normalized = `${parts[1]} ${parts[0]}`;
      } else {
        // Multiple commas, just remove them
        normalized = normalized.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }

    // Remove common suffixes like Jr, Sr, III, etc.
    normalized = normalized.replace(/\b(jr|sr|ii|iii|iv|phd|md|esq)\b/g, '').trim();

    // Handle middle initials: "John R Smith" → "john smith"
    // Keep only first and last name for consistency
    const words = normalized.split(' ').filter(w => w.length > 0);
    if (words.length > 2) {
      // Remove middle initials (single letters) and middle names
      const filtered = words.filter((word, index) => {
        // Keep first and last word always
        if (index === 0 || index === words.length - 1) return true;
        // Skip single letter middle initials
        if (word.length === 1) return false;
        // Skip common middle name indicators
        if (['de', 'la', 'von', 'van', 'del'].includes(word)) return true;
        // Skip other middle names for consistency
        return false;
      });

      // Handle compound last names with particles
      if (filtered.length > 2) {
        // If we have particles like "de", "van", etc., keep them with last name
        return filtered.join(' ');
      }

      normalized = filtered.join(' ');
    }

    return normalized.replace(/\s+/g, ' ').trim();
  }

  // Helper: Convert ISBN-10 to ISBN-13
  isbn10to13(isbn10) {
    if (!isbn10 || isbn10.length !== 10) return null;

    const isbn = '978' + isbn10.substring(0, 9);
    let sum = 0;

    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return isbn + checkDigit;
  }

  // Helper: Normalize ISBN
  normalizeISBN(isbn) {
    if (!isbn) return null;

    const cleaned = isbn.replace(/[- ]/g, '');

    if (cleaned.length === 10) {
      return this.isbn10to13(cleaned);
    }

    if (cleaned.length === 13) {
      return cleaned;
    }

    return null;
  }

  // Enhanced deduplication with fuzzy matching
  deduplicateResults(books) {
    const unique = [];
    const seenISBNs = new Set();

    for (const book of books) {
      let isDuplicate = false;

      // Check ISBN matches (most reliable)
      const normalizedISBN = this.normalizeISBN(book.isbn);
      if (normalizedISBN && seenISBNs.has(normalizedISBN)) {
        isDuplicate = true;
      }

      // Check for fuzzy title + author match
      if (!isDuplicate) {
        const normalizedTitle = this.normalizeTitle(book.title);
        const normalizedAuthor = this.normalizeAuthor(book.author);

        for (let i = 0; i < unique.length; i++) {
          const existing = unique[i];
          const existingTitle = this.normalizeTitle(existing.title);
          const existingAuthor = this.normalizeAuthor(existing.author);

          const titleSimilarity = this.stringSimilarity(normalizedTitle, existingTitle);
          const authorSimilarity = this.stringSimilarity(normalizedAuthor, existingAuthor);

          // Consider it a duplicate if:
          // - Title is 90%+ similar AND author is 85%+ similar, OR
          // - Title is 95%+ similar AND same normalized author, OR
          // - Exact title match AND similar author (80%+)
          if (
            (titleSimilarity >= 0.90 && authorSimilarity >= 0.85) ||
            (titleSimilarity >= 0.95 && authorSimilarity >= 0.70) ||
            (titleSimilarity === 1.0 && authorSimilarity >= 0.80)
          ) {
            isDuplicate = true;

            // Keep the one with higher source weight
            if (book.sourceWeight > existing.sourceWeight) {
              unique[i] = book;
              if (normalizedISBN) seenISBNs.add(normalizedISBN);
            }

            break;
          }
        }
      }

      if (!isDuplicate) {
        unique.push(book);
        if (normalizedISBN) seenISBNs.add(normalizedISBN);
      }
    }

    console.log(`📊 Deduplication: ${books.length} → ${unique.length} books (removed ${books.length - unique.length} duplicates)`);
    return unique;
  }

  // Ensure diversity in results to avoid author/series domination
  ensureDiversity(books, options = {}) {
    const maxPerAuthor = options.maxPerAuthor || 3;
    const maxSimilarTitles = options.maxSimilarTitles || 2;

    const authorCounts = new Map();
    const diverse = [];
    const skipped = [];

    for (const book of books) {
      const authorKey = this.normalizeAuthor(book.author);
      const authorCount = authorCounts.get(authorKey) || 0;

      // Check if we've hit the author limit
      if (authorCount >= maxPerAuthor) {
        skipped.push(book);
        continue;
      }

      
      let tooSimilar = false;
      const booksSameAuthor = diverse.filter(b =>
        this.normalizeAuthor(b.author) === authorKey
      );

      for (const existing of booksSameAuthor) {
        const titleSim = this.stringSimilarity(
          this.normalizeTitle(book.title),
          this.normalizeTitle(existing.title)
        );

        
        if (titleSim >= 0.70) {
          const sameAuthorSimilar = booksSameAuthor.filter(b => {
            const sim = this.stringSimilarity(
              this.normalizeTitle(b.title),
              this.normalizeTitle(existing.title)
            );
            return sim >= 0.70;
          }).length;

          if (sameAuthorSimilar >= maxSimilarTitles) {
            tooSimilar = true;
            break;
          }
        }
      }

      if (!tooSimilar) {
        diverse.push(book);
        authorCounts.set(authorKey, authorCount + 1);
      } else {
        skipped.push(book);
      }
    }

    
    if (diverse.length < 20 && skipped.length > 0) {
      console.log(`📚 Adding back ${Math.min(10, skipped.length)} skipped books for variety`);
      diverse.push(...skipped.slice(0, 10));
    }

    console.log(`🎨 Diversity filter: ${books.length} → ${diverse.length} books (${skipped.length} skipped for diversity)`);

    // Apply publication date diversity to ensure spread across different eras
    return this.ensurePublicationDiversity(diverse);
  }

  // Ensure results span different publication periods for variety
  ensurePublicationDiversity(books) {
    if (books.length <= 10) return books; // Too few to diversify

    // Group books by decade
    const decadeCounts = new Map();
    const reordered = [];
    const remainder = [];

    // Parse publication years and group by decade
    const booksWithDecade = books.map(book => {
      let year = null;
      if (book.publishedDate) {
        const match = book.publishedDate.match(/(\d{4})/);
        year = match ? parseInt(match[1]) : null;
      }
      const decade = year ? Math.floor(year / 10) * 10 : null;
      return { book, decade, year };
    });

    // First pass: take top books from each decade (round-robin style)
    const maxPerDecade = 3;
    for (const item of booksWithDecade) {
      const { book, decade } = item;

      if (!decade) {
        remainder.push(book);
        continue;
      }

      const decadeCount = decadeCounts.get(decade) || 0;

      if (decadeCount < maxPerDecade) {
        reordered.push(book);
        decadeCounts.set(decade, decadeCount + 1);
      } else {
        remainder.push(book);
      }
    }

    // Second pass: add remainder while maintaining diversity
    const finalResults = [...reordered, ...remainder];

    const decadeSpread = Array.from(decadeCounts.entries())
      .map(([decade, count]) => `${decade}s: ${count}`)
      .join(', ');

    console.log(`📅 Publication diversity: ${decadeSpread}`);

    return finalResults;
  }


  async generateBookEmbedding(book) {
    // Use weighted repetition to emphasize important fields
    const parts = [];

    // Title is most important - repeat 3x with variations
    parts.push(book.title);
    parts.push(book.title);
    parts.push(`${book.title} book`);

    // Author - repeat 2x
    parts.push(`by ${book.author}`);
    parts.push(`${book.author} author`);

    // Genre is crucial - repeat 2x with context
    if (book.genre && book.genre !== 'Unknown') {
      parts.push(`${book.genre} fiction`);
      parts.push(`${book.genre} novel`);
    }

    // Extract key themes and moods from description
    if (book.description) {
      const descLower = book.description.toLowerCase();

      // Add description start (most important sentences)
      const descStart = book.description.substring(0, 400);
      parts.push(descStart);

      // Extract character-related info (weighted heavily)
      const characterKeywords = ['protagonist', 'hero', 'heroine', 'character', 'woman', 'man', 'girl', 'boy', 'lead'];
      const sentences = book.description.split(/[.!?]+/);
      const characterSentences = sentences.filter(s =>
        characterKeywords.some(kw => s.toLowerCase().includes(kw))
      ).slice(0, 3);
      parts.push(...characterSentences);

      // Extract mood/atmosphere keywords
      const moodKeywords = ['dark', 'uplifting', 'emotional', 'funny', 'thrilling', 'suspenseful', 'heartwarming', 'intense'];
      const foundMoods = moodKeywords.filter(mood => descLower.includes(mood));
      if (foundMoods.length > 0) {
        parts.push(`${foundMoods.join(' ')} atmosphere`);
      }

      // Extract theme keywords
      const themeKeywords = ['love', 'friendship', 'family', 'war', 'survival', 'magic', 'adventure', 'mystery'];
      const foundThemes = themeKeywords.filter(theme => descLower.includes(theme));
      if (foundThemes.length > 0) {
        parts.push(`themes of ${foundThemes.join(' ')}`);
      }
    }

    // Add page count context for pacing
    if (book.pages) {
      if (book.pages < 200) parts.push('quick read short book');
      else if (book.pages > 500) parts.push('long epic novel');
    }

    const bookText = parts.join('. ').substring(0, 2000); // Increased from 1500
    return this.generateEmbedding(bookText);
  }


  async generateQueryEmbedding(query, intent) {
    // Build enriched query with weighted importance
    const queryParts = [];

    // Original query - repeat 2x for emphasis
    queryParts.push(query);
    queryParts.push(query);

    // Primary genre - heavily weighted
    if (intent.primaryGenre && intent.primaryGenre !== 'general') {
      queryParts.push(`${intent.primaryGenre} novel`);
      queryParts.push(`${intent.primaryGenre} fiction`);
    }

    // All detected genres
    if (intent.genres && intent.genres.length > 0) {
      queryParts.push(...intent.genres.map(g => `${g} book`));
    }

    // Mood/atmosphere - important for matching
    if (intent.mood) {
      queryParts.push(`${intent.mood} story`);
      queryParts.push(`${intent.mood} atmosphere`);
    }

    // Sentiment preference
    if (intent.sentiment) {
      queryParts.push(`${intent.sentiment} tone`);
    }

    // Character requirements - heavily weighted
    if (intent.characterRequirements && intent.characterRequirements.length > 0) {
      queryParts.push(...intent.characterRequirements.map(req => `${req} book`));
      queryParts.push(...intent.characterRequirements.map(req => `${req} novel`));
    }

    // Themes - important for semantic matching
    if (intent.themes && intent.themes.length > 0) {
      queryParts.push(...intent.themes.map(theme => `${theme} fiction`));
      queryParts.push(`themes of ${intent.themes.join(' ')}`);
    }

    // Pace preference
    if (intent.pacePreference && intent.pacePreference !== 'any') {
      queryParts.push(`${intent.pacePreference}-paced reading`);
    }

    // Similar-to reference
    if (intent.similarTo) {
      queryParts.push(`similar to ${intent.similarTo}`);
      queryParts.push(`like ${intent.similarTo}`);
    }

    const enrichedQuery = queryParts.join('. ');
    return this.generateEmbedding(enrichedQuery);
  }

  // Get session-based preference boost from recently clicked books
  getSessionPreferenceBoost(book) {
    if (!window.sessionClickData || window.sessionClickData.length === 0) {
      return 0;
    }

    const recentClicks = window.sessionClickData.slice(-5); // Last 5 clicks
    let totalBoost = 0;

    recentClicks.forEach((click, index) => {
      // More recent clicks get higher weight
      const recencyWeight = (index + 1) / recentClicks.length;

      // Genre matching
      if (click.book.genre === book.genre) {
        totalBoost += 0.04 * recencyWeight;
      }

      // Author matching
      if (click.book.author === book.author) {
        totalBoost += 0.06 * recencyWeight;
      }

      // Similar page count (within 30%)
      if (click.book.pages && book.pages) {
        const pageDiff = Math.abs(click.book.pages - book.pages) / click.book.pages;
        if (pageDiff < 0.3) {
          totalBoost += 0.03 * recencyWeight;
        }
      }

      // High match score indicates user interest
      if (click.matchScore > 0.7) {
        totalBoost += 0.02 * recencyWeight;
      }
    });

    return Math.min(totalBoost, 0.15); // Cap at 0.15
  }

  async rankResults(books, intent, userContext) {

    const queryEmbedding = await this.generateQueryEmbedding(intent.originalQuery, intent);
    const scored = [];


    const filteredBooks = books.filter(book => {
      const titleLower = book.title.toLowerCase();
      const descLower = (book.description || '').toLowerCase();
      const combined = titleLower + ' ' + descLower;


      const academicTitleKeywords = [
        'survey of', 'history of', 'overview of', 'companion to',
        'guide to', 'introduction to', 'handbook', 'encyclopedia',
        'dictionary', 'reference', 'textbook', 'reader',
        'critical essays', 'criticism', 'literary criticism',
        'journal', 'scholarly', 'academic', 'essays on',
        'perspectives on', 'approaches to', 'studies in'
      ];

      const hasAcademicTitle = academicTitleKeywords.some(keyword => titleLower.includes(keyword));


      const academicPhrases = [
        'this study', 'this analysis', 'this book examines', 'this volume',
        'this collection', 'scholarly', 'peer-reviewed', 'academic press',
        'university press', 'critical analysis', 'literary analysis',
        'theoretical framework', 'research findings'
      ];

      const hasAcademicPhrases = academicPhrases.some(phrase => combined.includes(phrase));


      const genre = (book.genre || '').toLowerCase();
      const isNonFictionGenre = genre.includes('reference') ||
                                genre.includes('textbook') ||
                                genre.includes('education') ||
                                genre.includes('literary criticism');


      const hasSuspectWords = (titleLower.includes('review') ||
                               titleLower.includes('analysis') ||
                               titleLower.includes('critique')) &&
                              !titleLower.includes('novel') &&
                              !titleLower.includes('story') &&
                              !titleLower.includes('fiction');

      const isAcademic = hasAcademicTitle || hasAcademicPhrases || isNonFictionGenre || hasSuspectWords;

      if (isAcademic) {
        console.log(`  ❌ Filtered academic: "${book.title}"`);
        return false;
      }

      // Filter based on format preference
      if (intent.formatPreference && intent.formatPreference.avoidCollections) {
        const collectionIndicators = [
          'collection', 'anthology', 'short stories', 'stories',
          'collected works', 'complete stories', 'selected stories',
          'compilation'
        ];

        const isCollection = collectionIndicators.some(indicator =>
          titleLower.includes(indicator) || descLower.includes(indicator)
        );

        if (isCollection) {
          console.log(`  ❌ Filtered collection (user wants novels): "${book.title}"`);
          return false;
        }
      }

      // Filter for collections if that's what user wants
      if (intent.formatPreference && intent.formatPreference.type === 'collection') {
        const collectionIndicators = [
          'collection', 'anthology', 'short stories', 'stories',
          'collected works', 'complete stories', 'selected stories',
          'compilation'
        ];

        const isCollection = collectionIndicators.some(indicator =>
          titleLower.includes(indicator) || descLower.includes(indicator)
        );

        if (!isCollection) {
          console.log(`  ❌ Filtered non-collection (user wants collections): "${book.title}"`);
          return false;
        }
      }

      return true;
    });

    console.log(`📚 Filtered ${books.length - filteredBooks.length} books (academic/format mismatch) out of ${books.length}`);

    for (const book of filteredBooks) {
      
      const bookEmbedding = await this.generateBookEmbedding(book);

      const baseSimilarity = this.cosineSimilarity(queryEmbedding, bookEmbedding);

      
      const queryWords = intent.originalQuery.toLowerCase().split(' ').filter(w => w.length > 3);
      const bookTitleLower = book.title.toLowerCase();
      const bookDescLower = (book.description || '').toLowerCase();

      let keywordBoost = 0;
      queryWords.forEach(word => {
        if (bookTitleLower.includes(word)) keywordBoost += 0.05; 
        if (bookDescLower.includes(word)) keywordBoost += 0.02; 
      });

      
      const similarity = Math.min(1.0, baseSimilarity + keywordBoost);

      // Enhanced user preference with recency weighting
      let userPreferenceScore = 0;
      if (userContext.hasHistory && userContext.favoriteEmbeddings.length > 0) {
        const userSimilarities = userContext.favoriteEmbeddings.map(fav => {
          const similarity = this.cosineSimilarity(bookEmbedding, fav.embedding);
          const ratingWeight = fav.rating / 5;
          const recencyWeight = fav.recencyWeight || 1.0;
          return similarity * ratingWeight * recencyWeight;
        });
        userPreferenceScore = Math.max(...userSimilarities);
      }

      // Negative signals - penalize disliked authors/genres
      let avoidancePenalty = 0;
      if (userContext.avoidAuthors && userContext.avoidAuthors.includes(book.author)) {
        avoidancePenalty += 0.15; // Significant penalty for disliked authors
      }
      if (userContext.avoidGenres && userContext.avoidGenres.includes(book.genre)) {
        avoidancePenalty += 0.10; // Penalty for disliked genres
      }

      // Check for excluded terms from compound query
      if (intent.excludedTerms && intent.excludedTerms.length > 0) {
        const bookText = `${book.title} ${book.description || ''}`.toLowerCase();
        const hasExcluded = intent.excludedTerms.some(term => bookText.includes(term.toLowerCase()));
        if (hasExcluded) {
          avoidancePenalty += 0.20; // Strong penalty for explicitly excluded terms
        }
      }

      let genreBonus = 0;
      if (book.genre) {
        if (userContext.favoriteGenres.includes(book.genre)) {
          genreBonus = 0.15;
        }
        const intentGenres = intent.genres.map(g => g.toLowerCase());
        if (intentGenres.some(g => book.genre.toLowerCase().includes(g))) {
          genreBonus += 0.1;
        }
      }

      let authorBonus = 0;
      if (userContext.favoriteAuthors.includes(book.author)) {
        authorBonus = 0.2;
      }

      
      let titleBonus = 0;
      const queryLower = intent.originalQuery.toLowerCase();
      const titleLower = book.title.toLowerCase();
      const normalizedQuery = this.normalizeTitle(queryLower);
      const normalizedTitle = this.normalizeTitle(titleLower);

      
      const titleSimilarity = this.stringSimilarity(normalizedQuery, normalizedTitle);
      if (titleSimilarity >= 0.95) {
        titleBonus = 0.25; 
      } else if (titleSimilarity >= 0.85) {
        titleBonus = 0.15; 
      } else {
        
        const queryWords = queryLower.split(' ').filter(w => w.length > 3);
        const titleMatches = queryWords.filter(word => titleLower.includes(word)).length;
        titleBonus = Math.min(titleMatches * 0.04, 0.12);
      }

      
      let descBonus = 0;
      if (book.description) {
        const descLower = book.description.toLowerCase();

        
        const themeMatches = intent.themes.filter(theme =>
          descLower.includes(theme.toLowerCase())
        ).length;

        
        const queryWords = queryLower.split(' ').filter(w => w.length > 4);
        const descMatches = queryWords.filter(word => descLower.includes(word)).length;

        descBonus = Math.min(themeMatches * 0.025 + descMatches * 0.015, 0.10);
      }

      
      const authorLower = book.author.toLowerCase();
      let authorMatchBonus = 0;
      if (queryLower.includes(authorLower) || authorLower.includes(queryLower)) {
        authorMatchBonus = 0.15;
      }

      
      let characterBonus = 0;
      if (intent.characterRequirements && intent.characterRequirements.length > 0 && book.description) {
        const descLower = book.description.toLowerCase();

        
        if (intent.characterRequirements.includes('strong female lead')) {
          const femaleIndicators = ['female protagonist', 'woman', 'heroine', 'girl', 'she', 'her'];
          const hasFemaleIndicator = femaleIndicators.some(ind => descLower.includes(ind));

          
          const femaleCount = (descLower.match(/\b(woman|heroine|female protagonist|she)\b/g) || []).length;

          if (hasFemaleIndicator) {
            characterBonus = Math.min(0.15 + (femaleCount * 0.02), 0.25); 
          }
        }

        
        if (intent.characterRequirements.includes('diverse cast')) {
          if (descLower.includes('diverse') || descLower.includes('multicultural')) {
            characterBonus += 0.10;
          }
        }
      }

      
      
      
      // Popularity boost based on rating
      let popularityBoost = 0;
      if (book.rating) {
        // Books with high ratings get a small boost
        if (book.rating >= 4.5) popularityBoost = 0.08;
        else if (book.rating >= 4.0) popularityBoost = 0.05;
        else if (book.rating >= 3.5) popularityBoost = 0.02;
      }

      // Recency boost for newer books
      let recencyBoost = 0;
      if (book.publishedDate) {
        const year = parseInt(book.publishedDate.substring(0, 4));
        const currentYear = new Date().getFullYear();
        const yearsAgo = currentYear - year;
        if (yearsAgo <= 1) recencyBoost = 0.05;
        else if (yearsAgo <= 3) recencyBoost = 0.03;
        else if (yearsAgo <= 5) recencyBoost = 0.01;
      }

      // Pace preference matching
      let paceBonus = 0;
      if (intent.pacePreference && intent.pacePreference !== 'any' && book.pages) {
        if (intent.pacePreference === 'fast' && book.pages < 350) paceBonus = 0.05;
        if (intent.pacePreference === 'slow' && book.pages > 400) paceBonus = 0.05;
      }

      // Series matching bonus
      let seriesBonus = 0;
      if (intent.seriesInfo && intent.seriesInfo.isSeries) {
        const seriesInfo = intent.seriesInfo;
        const titleLower = book.title.toLowerCase();
        const descLower = (book.description || '').toLowerCase();

        // Check if series name appears in title or description
        if (seriesInfo.seriesName) {
          const seriesNameLower = seriesInfo.seriesName.toLowerCase();
          if (titleLower.includes(seriesNameLower)) {
            seriesBonus += 0.15; // Strong match - series name in title
          } else if (descLower.includes(seriesNameLower)) {
            seriesBonus += 0.08; // Moderate match - series name in description
          }
        }

        // Check if book number matches (for queries like "book 2" or "second book")
        if (seriesInfo.bookNumber) {
          const numberPatterns = [
            new RegExp(`\\b${seriesInfo.bookNumber}\\b`, 'i'), // Exact number
            new RegExp(`book\\s*${seriesInfo.bookNumber}`, 'i'), // "book 2"
            new RegExp(`#${seriesInfo.bookNumber}`, 'i') // "#2"
          ];

          const hasNumberInTitle = numberPatterns.some(pattern => pattern.test(titleLower));
          if (hasNumberInTitle) {
            seriesBonus += 0.12; // Exact book number match
          }
        }

        // Boost if looking for first book and title suggests it's first
        if (seriesInfo.wantsFirst) {
          const firstBookIndicators = /\b(first|book\s*1|#1|one|beginning)\b/i;
          if (firstBookIndicators.test(titleLower)) {
            seriesBonus += 0.10;
          }
        }
      }

      // Length matching bonus based on completion patterns
      let lengthBonus = 0;
      if (userContext.preferredLength && book.pages) {
        const bookCategory = book.pages <= 250 ? 'short' :
                            book.pages <= 400 ? 'medium' :
                            book.pages <= 600 ? 'long' : 'epic';

        // Strong bonus if book matches user's most-completed length category
        if (bookCategory === userContext.preferredLength) {
          const completionRate = userContext.completionRates[bookCategory] || 0;
          lengthBonus = completionRate * 0.10; // Up to 0.10 bonus for 100% completion rate
        }
      }

      // Session-based preference boost
      const sessionBonus = this.getSessionPreferenceBoost(book);

      // Trope matching bonus
      let tropeBonus = 0;
      if (intent.tropes && intent.tropes.length > 0 && book.description) {
        const descLower = book.description.toLowerCase();
        const tropeMap = {
          'enemies-to-lovers': ['enemies', 'hate to love', 'rivals'],
          'found-family': ['found family', 'chosen family', 'misfit'],
          'slow-burn': ['slow burn', 'gradual'],
          'love-triangle': ['love triangle', 'torn between'],
          'chosen-one': ['chosen', 'prophecy', 'destiny'],
          'redemption-arc': ['redemption', 'reformed'],
          'time-travel': ['time travel', 'time loop'],
          'underdog': ['underdog', 'unlikely hero']
        };

        intent.tropes.forEach(trope => {
          const keywords = tropeMap[trope] || [trope.replace(/-/g, ' ')];
          const hasMatch = keywords.some(kw => descLower.includes(kw));
          if (hasMatch) {
            tropeBonus += 0.08; // Significant bonus for trope match
          }
        });
      }

      // Award/accolade matching bonus
      let awardBonus = 0;
      if (intent.awards && intent.awards.length > 0) {
        const titleDescLower = (book.title + ' ' + (book.description || '')).toLowerCase();

        // Check if book mentions awards
        intent.awards.forEach(award => {
          const awardKeywords = {
            'bestseller': ['bestseller', 'best seller', 'new york times'],
            'award-winning': ['award', 'prize', 'winner'],
            'pulitzer': ['pulitzer'],
            'hugo': ['hugo'],
            'nebula': ['nebula'],
            'man-booker': ['booker']
          };

          const keywords = awardKeywords[award] || [award];
          const hasAward = keywords.some(kw => titleDescLower.includes(kw));
          if (hasAward) {
            awardBonus += 0.10; // Good bonus for matching awards
          }
        });

        // High ratings often correlate with awards
        if (book.rating && book.rating >= 4.5) {
          awardBonus += 0.03;
        }
      }

      // Temporal context matching
      let temporalBonus = 0;
      if (intent.temporalContext && book.publishedDate) {
        const year = parseInt(book.publishedDate.substring(0, 4));
        const currentYear = new Date().getFullYear();

        if (intent.temporalContext === 'recent') {
          const yearsAgo = currentYear - year;
          if (yearsAgo <= 2) temporalBonus = 0.08;
          else if (yearsAgo <= 5) temporalBonus = 0.05;
          else if (yearsAgo <= 10) temporalBonus = 0.02;
        } else if (intent.temporalContext === 'classic') {
          const yearsAgo = currentYear - year;
          if (yearsAgo >= 30) temporalBonus = 0.08;
          else if (yearsAgo >= 20) temporalBonus = 0.05;
          else if (yearsAgo >= 10) temporalBonus = 0.02;
        }
      }

      // Format matching bonus (novel vs collection, standalone vs series)
      let formatBonus = 0;
      if (intent.formatPreference) {
        const titleLower = book.title.toLowerCase();
        const descLower = (book.description || '').toLowerCase();

        // Standalone bonus
        if (intent.formatPreference.wantsStandalone) {
          const standaloneIndicators = ['standalone', 'complete', 'self-contained'];
          const hasStandalone = standaloneIndicators.some(ind =>
            titleLower.includes(ind) || descLower.includes(ind)
          );

          // Check if title suggests it's NOT part of a series
          const noSeriesIndicators = /\b(?:book\s+[0-9]|#[0-9]|volume\s+[0-9]|part\s+[0-9])\b/i;
          const looksLikeSeries = noSeriesIndicators.test(book.title);

          if (hasStandalone || !looksLikeSeries) {
            formatBonus += 0.06;
          }
        }

        // Series bonus
        if (intent.formatPreference.wantsSeries) {
          const seriesIndicators = /\b(?:book\s+[0-9]|#[0-9]|volume\s+[0-9]|series|trilogy|saga)\b/i;
          const looksLikeSeries = seriesIndicators.test(titleLower) ||
                                  seriesIndicators.test(descLower);

          if (looksLikeSeries) {
            formatBonus += 0.06;
          }
        }

        // Format type bonus (already filtered, but boost confidence)
        if (intent.formatPreference.type === 'novel' && intent.formatPreference.avoidCollections) {
          // Book passed collection filter, give small bonus for being a novel
          formatBonus += 0.03;
        }

        if (intent.formatPreference.type === 'collection') {
          // Book passed filter and is a collection
          formatBonus += 0.08; // Strong bonus for matching rare format request
        }
      }

      // Calculate weighted final score
      let finalScore = similarity * 0.35; // Reduced to make room for other factors

      // Apply bonuses with updated weights
      finalScore += titleBonus * 1.6;        // Increased - exact matches are important
      finalScore += genreBonus * 1.3;        // Increased - genre matching is crucial
      finalScore += characterBonus * 1.4;    // Increased - character requirements are key
      finalScore += descBonus * 0.9;         // Slightly increased
      finalScore += authorMatchBonus * 1.0;  // Increased - author searches are intentional
      finalScore += popularityBoost;         // New: reward quality books
      finalScore += recencyBoost;            // New: slight boost for recent books
      finalScore += paceBonus;               // New: match reading pace preference
      finalScore += seriesBonus * 1.5;       // New: prioritize series matches
      finalScore += lengthBonus * 1.2;       // New: favor books user tends to complete
      finalScore += sessionBonus * 1.3;      // New: learn from session clicks
      finalScore += tropeBonus * 1.4;        // New: trope matching is highly specific
      finalScore += awardBonus * 1.1;        // New: award/accolade matching
      finalScore += temporalBonus * 1.0;     // New: temporal context (recent/classic)
      finalScore += formatBonus * 1.3;       // New: format matching (novel/collection/standalone/series)

      // User preference with higher weight
      finalScore += userPreferenceScore * 0.15; // Increased from 0.02

      // Source weight (strategy confidence)
      finalScore += book.sourceWeight * 0.05;

      // Apply avoidance penalty (subtract)
      finalScore -= avoidancePenalty;

      // Ensure score stays in valid range
      finalScore = Math.max(0, Math.min(1.0, finalScore));


      const isDebugBook = bookTitleLower.includes('graceling') ||
                          bookTitleLower.includes('mistborn') ||
                          finalScore > 0.50;

      if (isDebugBook) {
        console.log(`  📊 ${book.title} = ${(finalScore * 100).toFixed(1)}%`, {
          semantic: (similarity * 100).toFixed(0) + '%',
          titleBonus: titleBonus.toFixed(3),
          genreBonus: genreBonus.toFixed(3),
          charBonus: characterBonus.toFixed(3),
          descBonus: descBonus.toFixed(3),
          seriesBonus: seriesBonus.toFixed(3),
          lengthBonus: lengthBonus.toFixed(3),
          sessionBonus: sessionBonus.toFixed(3),
          tropeBonus: tropeBonus.toFixed(3),
          awardBonus: awardBonus.toFixed(3),
          temporalBonus: temporalBonus.toFixed(3),
          formatBonus: formatBonus.toFixed(3),
          userPref: userPreferenceScore.toFixed(3),
          popularity: popularityBoost.toFixed(3),
          recency: recencyBoost.toFixed(3),
          pace: paceBonus.toFixed(3),
          penalty: avoidancePenalty.toFixed(3),
          source: book.sourceWeight.toFixed(2)
        });
      }

      scored.push({
        ...book,
        similarityScore: similarity,
        userPreferenceScore,
        finalScore,
        matchReasons: this.generateMatchReasons(book, intent, userContext, {
          similarity,
          userPreferenceScore,
          genreBonus,
          authorBonus,
          titleBonus,
          titleSimilarity,
          authorMatchBonus,
          characterBonus,
          descBonus,
          popularityBoost,
          recencyBoost,
          paceBonus,
          seriesBonus,
          lengthBonus,
          sessionBonus,
          tropeBonus,
          awardBonus,
          temporalBonus,
          formatBonus,
          avoidancePenalty
        })
      });
    }

    return scored.sort((a, b) => b.finalScore - a.finalScore);
  }

  generateMatchReasons(book, intent, userContext, scores) {
    const reasons = [];

    // Priority 1: Exact/near-exact title matches
    if (scores.titleSimilarity >= 0.95) {
      reasons.push(`🎯 Exact match: "${book.title}"`);
    } else if (scores.titleSimilarity >= 0.85) {
      reasons.push(`🎯 Very close match to your search`);
    }

    // Priority 2: Character requirements (highly specific user intent)
    if (scores.characterBonus > 0.15) {
      reasons.push(`👸 Strong female protagonist`);
    } else if (scores.characterBonus > 0.08) {
      reasons.push(`👤 Features requested character type`);
    }

    // Priority 2.5: Series matching (highly specific user intent)
    if (scores.seriesBonus > 0.15) {
      if (intent.seriesInfo && intent.seriesInfo.bookNumber) {
        reasons.push(`📚 Book #${intent.seriesInfo.bookNumber} in series`);
      } else if (intent.seriesInfo && intent.seriesInfo.seriesName) {
        reasons.push(`📚 Part of ${intent.seriesInfo.seriesName} series`);
      } else if (intent.seriesInfo && intent.seriesInfo.wantsFirst) {
        reasons.push(`📚 First book in series`);
      } else {
        reasons.push(`📚 Matches series request`);
      }
    } else if (scores.seriesBonus > 0.08) {
      reasons.push(`📖 Related to requested series`);
    }

    // Priority 3: Author matches
    if (scores.authorMatchBonus > 0) {
      reasons.push(`✍️ Author "${book.author}" in your query`);
    } else if (scores.authorBonus > 0) {
      reasons.push(`⭐ By ${book.author}, an author you love`);
    }

    // Priority 4: User preference alignment (with recency)
    if (scores.userPreferenceScore > 0.70) {
      reasons.push(`💝 Highly similar to books you loved`);
    } else if (scores.userPreferenceScore > 0.50) {
      reasons.push(`👍 Similar to books you enjoyed`);
    } else if (scores.userPreferenceScore > 0.35) {
      reasons.push(`📚 Matches your reading taste`);
    }

    // Priority 5: Genre matching
    if (scores.genreBonus > 0.15) {
      reasons.push(`🎭 Perfect genre: ${book.genre}`);
    } else if (scores.genreBonus > 0) {
      reasons.push(`🎭 ${book.genre} - a genre you like`);
    }

    // Priority 6: Popularity/quality signals
    if (scores.popularityBoost && scores.popularityBoost >= 0.05) {
      const rating = book.rating || 0;
      reasons.push(`⭐ Highly rated (${rating.toFixed(1)}★)`);
    }

    // Priority 7: Recency for new releases
    if (scores.recencyBoost && scores.recencyBoost >= 0.03) {
      const year = book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : null;
      if (year) {
        reasons.push(`🆕 Recent release (${year})`);
      }
    }

    // Priority 8: Pace/length matching
    if (scores.paceBonus && scores.paceBonus > 0) {
      if (intent.pacePreference === 'fast') {
        reasons.push(`⚡ Fast-paced quick read`);
      } else if (intent.pacePreference === 'slow') {
        reasons.push(`📚 Immersive, contemplative read`);
      }
    }

    // Priority 8.5: Length completion bonus
    if (scores.lengthBonus && scores.lengthBonus >= 0.07) {
      const category = book.pages <= 250 ? 'shorter' :
                      book.pages <= 400 ? 'medium-length' :
                      book.pages <= 600 ? 'longer' : 'epic';
      reasons.push(`📏 ${category.charAt(0).toUpperCase() + category.slice(1)} book you tend to finish`);
    }

    // Priority 8.7: Session-based learning
    if (scores.sessionBonus && scores.sessionBonus >= 0.06) {
      reasons.push(`🎯 Similar to books you just clicked`);
    }

    // Priority 8.8: Trope matching
    if (scores.tropeBonus && scores.tropeBonus >= 0.08) {
      if (intent.tropes && intent.tropes.length > 0) {
        const tropeNames = intent.tropes.map(t => t.replace(/-/g, ' ')).join(', ');
        reasons.push(`💫 Features: ${tropeNames}`);
      }
    }

    // Priority 8.9: Award/Accolade matching
    if (scores.awardBonus && scores.awardBonus >= 0.10) {
      if (intent.awards && intent.awards.includes('bestseller')) {
        reasons.push(`🏆 Bestseller / Highly acclaimed`);
      } else if (intent.awards && intent.awards.length > 0) {
        reasons.push(`🏆 Award-winning book`);
      }
    }

    // Priority 9: Temporal context matching
    if (scores.temporalBonus && scores.temporalBonus >= 0.05) {
      if (intent.temporalContext === 'recent') {
        const year = book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : null;
        if (year) reasons.push(`🆕 Recent release (${year})`);
      } else if (intent.temporalContext === 'classic') {
        reasons.push(`📜 Classic, timeless work`);
      }
    }

    // Priority 9.5: Format matching
    if (scores.formatBonus && scores.formatBonus >= 0.06) {
      if (intent.formatPreference) {
        if (intent.formatPreference.wantsStandalone) {
          reasons.push(`📖 Standalone novel (complete story)`);
        } else if (intent.formatPreference.wantsSeries) {
          reasons.push(`📚 Part of a series`);
        } else if (intent.formatPreference.type === 'collection') {
          reasons.push(`📑 Short story collection/anthology`);
        } else if (intent.formatPreference.type === 'novel') {
          reasons.push(`📕 Full-length novel`);
        }
      }
    }

    // Priority 10: Semantic AI matching
    if (scores.similarity > 0.80) {
      reasons.push(`🧠 Excellent AI match (${Math.round(scores.similarity * 100)}%)`);
    } else if (scores.similarity > 0.65) {
      reasons.push(`🧠 Strong AI match (${Math.round(scores.similarity * 100)}%)`);
    }

    // Priority 10: Title keyword matches
    if (scores.titleBonus > 0.08 && scores.titleSimilarity < 0.85) {
      reasons.push(`📖 Title contains key search terms`);
    }

    // Priority 11: Mood matching
    if (intent.mood && book.description) {
      const descLower = book.description.toLowerCase();
      if (descLower.includes(intent.mood.toLowerCase())) {
        const moodCap = intent.mood.charAt(0).toUpperCase() + intent.mood.slice(1);
        reasons.push(`🌟 ${moodCap} tone & atmosphere`);
      }
    }

    // Priority 12: Theme matching
    if (intent.themes && intent.themes.length > 0 && book.description) {
      const descLower = book.description.toLowerCase();
      const matchedThemes = intent.themes.filter(theme =>
        descLower.includes(theme.toLowerCase())
      );
      if (matchedThemes.length > 0) {
        reasons.push(`📝 Features: ${matchedThemes.slice(0, 2).join(', ')}`);
      }
    }

    // Priority 13: Description relevance
    if (scores.descBonus > 0.06) {
      reasons.push(`📄 Description highly relevant`);
    }

    // Fallback reasons
    if (reasons.length === 0) {
      if (scores.similarity > 0.40) {
        reasons.push(`✓ Good match for "${intent.originalQuery}"`);
      } else {
        reasons.push(`🔍 Discovered through intelligent search`);
      }
    }

    // Return top 4 reasons (prioritized by order added)
    return reasons.slice(0, 4);
  }

  // Typo correction - fix common misspellings in query
  correctTypos(query) {
    const commonWords = ['fantasy', 'science', 'fiction', 'mystery', 'romance', 'thriller', 'horror',
                         'young', 'adult', 'historical', 'contemporary', 'magical', 'dystopian',
                         'strong', 'female', 'protagonist', 'character', 'series', 'book', 'novel',
                         'dark', 'funny', 'emotional', 'uplifting', 'adventure', 'quest'];

    const words = query.toLowerCase().split(' ');
    const corrected = words.map(word => {
      if (word.length < 4) return word; // Skip short words

      let bestMatch = word;
      let minDistance = 2; // Only correct if 1-2 character difference

      for (const correctWord of commonWords) {
        const distance = this.levenshteinDistance(word, correctWord);
        if (distance > 0 && distance < minDistance && word.length >= correctWord.length - 2) {
          minDistance = distance;
          bestMatch = correctWord;
        }
      }

      return bestMatch;
    });

    const correctedQuery = corrected.join(' ');
    if (correctedQuery !== query.toLowerCase()) {
      console.log(`✏️ Auto-corrected: "${query}" → "${correctedQuery}"`);
    }
    return correctedQuery;
  }

  // Enrich query with contextual information
  async enrichQuery(query, userContext) {
    // Try Gemini AI enhancement first for complex queries
    if (window.geminiEnhancer && window.geminiEnhancer.enabled) {
      try {
        const aiEnhanced = await window.geminiEnhancer.enhanceQuery(query, userContext);

        if (aiEnhanced.enhanced) {
          console.log('🤖 Query enhanced by Gemini AI:', {
            original: aiEnhanced.originalQuery,
            enhanced: aiEnhanced.expandedQuery,
            themes: aiEnhanced.themes,
            mood: aiEnhanced.mood
          });

          // Store AI insights for use in result ranking
          this.lastAIInsights = {
            themes: aiEnhanced.themes,
            mood: aiEnhanced.mood,
            keyElements: aiEnhanced.keyElements
          };

          return aiEnhanced.expandedQuery;
        }
      } catch (error) {
        console.warn('Gemini enhancement failed, using fallback enrichment:', error);
      }
    }

    // Fallback to original rule-based enrichment
    let enriched = query;

    // Add implicit preferences from user's reading history
    if (userContext && userContext.favoriteGenres && userContext.favoriteGenres.length > 0) {
      const topGenre = userContext.favoriteGenres[0];

      // If query is very short (1-2 words), add genre context
      if (query.split(' ').length <= 2 && !query.match(/fantasy|sci-?fi|mystery|romance|thriller/i)) {
        enriched += ` ${topGenre.genre}`;
        console.log(`🎯 Enriched short query with preferred genre: ${topGenre.genre}`);
      }
    }

    // Detect contextual time-based preferences
    const hour = new Date().getHours();
    let timeContext = '';

    if (hour >= 6 && hour < 12) {
      timeContext = 'uplifting light'; // Morning: lighter reads
    } else if (hour >= 12 && hour < 17) {
      timeContext = ''; // Afternoon: neutral
    } else if (hour >= 17 && hour < 22) {
      timeContext = 'engaging immersive'; // Evening: immersive reads
    } else {
      timeContext = 'page-turner gripping'; // Night: page-turners
    }

    // Only add time context if query doesn't specify mood
    if (timeContext && !query.match(/light|dark|funny|sad|uplifting|gripping|engaging/i)) {
      enriched += ` ${timeContext}`;
      console.log(`⏰ Added time-based context: ${timeContext}`);
    }

    return enriched;
  }

  async search(query, options = {}) {
    console.log('🔍 Starting semantic search for:', query);

    // Apply typo correction
    const correctedQuery = this.correctTypos(query);
    let processedQuery = correctedQuery !== query.toLowerCase() ? correctedQuery : query;

    // Get user context early for query enrichment
    const userContextPreview = await this.getUserContext();

    // Enrich query with contextual information
    const finalQuery = await this.enrichQuery(processedQuery, userContextPreview);

    // Phase 4: Track search analytics
    this.trackSearchQuery(finalQuery);

    const cacheKey = `search_${finalQuery.toLowerCase().trim()}`;
    const USE_CACHE = true; // Phase 4: Smart caching enabled 

    if (USE_CACHE) {
      const cached = await this.getCachedSearch(cacheKey);
      if (cached) {
        // Dynamic TTL: 24 hours for AI-enhanced queries, 5 minutes for simple queries
        const ttl = cached.wasAIEnhanced
          ? 24 * 60 * 60 * 1000  // 24 hours for AI-enhanced queries (expensive API calls)
          : 5 * 60 * 1000;        // 5 minutes for simple queries

        if (Date.now() - cached.timestamp < ttl) {
          const ageMinutes = Math.round((Date.now() - cached.timestamp) / 60000);
          console.log(`✅ Returning cached results (${ageMinutes}m old, ${cached.wasAIEnhanced ? 'AI-enhanced' : 'standard'})`);

          if (cached.results && cached.results.results) {
            return cached.results;
          } else if (Array.isArray(cached.results)) {

            return {
              results: cached.results,
              metadata: { totalFound: cached.results.length, returned: cached.results.length }
            };
          }
          return cached.results;
        }
      }
    }

    try {
      console.log('📊 Analyzing query intent...');
      const intent = await this.analyzeIntent(finalQuery);
      console.log('Intent:', {
        genres: intent.genres,
        mood: intent.mood,
        themes: intent.themes,
        similarTo: intent.similarTo
      });

      console.log('👤 Getting user context...');
      const userContext = await this.getUserContext();
      console.log('User context:', {
        books: userContext.totalBooks,
        favoriteAuthors: userContext.favoriteAuthors.slice(0, 3),
        favoriteGenres: userContext.favoriteGenres
      });

      console.log('🎯 Building search strategies...');
      const strategies = this.buildSearchStrategies(intent, userContext);
      console.log('Strategies:', strategies.map(s => `${s.description} (${s.weight})`));

      console.log('🌐 Executing searches...');
      const rawResults = await this.executeSearches(strategies);

      if (rawResults.length === 0) {
        console.warn('⚠️ No results found, trying broader search');
        const fallbackBooks = await api.searchBooks(finalQuery);
        if (fallbackBooks.length > 0) {
          const rankedFallback = await this.rankResults(
            fallbackBooks.map(b => ({ ...b, sourceWeight: 0.5 })),
            intent,
            userContext
          );
          
          return {
            results: rankedFallback.slice(0, options.maxResults || 50),
            intent,
            userContext,
            strategies: ['Fallback broad search'],
            metadata: {
              totalFound: fallbackBooks.length,
              returned: Math.min(fallbackBooks.length, options.maxResults || 50),
              hasUserHistory: userContext.hasHistory,
              isFallback: true
            }
          };
        }
      }

      console.log('🧮 Ranking results with AI...');
      const rankedResults = await this.rankResults(rawResults, intent, userContext);

      
      const minScore = 0.30; 
      const qualityFiltered = rankedResults.filter(r => r.finalScore >= minScore);
      console.log(`📊 Quality filtered: ${qualityFiltered.length} of ${rankedResults.length} books (min score: ${minScore})`);

      
      const diversityFiltered = this.ensureDiversity(qualityFiltered, {
        maxPerAuthor: 3,
        maxSimilarTitles: 2
      });

      const maxResults = options.maxResults || 50;
      const finalResults = diversityFiltered.slice(0, maxResults);

      console.log('✅ Search complete!', {
        total: finalResults.length,
        topScore: finalResults[0]?.finalScore?.toFixed(3),
        avgScore: (finalResults.reduce((sum, r) => sum + r.finalScore, 0) / finalResults.length).toFixed(3)
      });

      let searchResult = {
        results: finalResults,
        intent,
        userContext,
        strategies: strategies.map(s => s.description),
        metadata: {
          totalFound: rawResults.length,
          returned: finalResults.length,
          hasUserHistory: userContext.hasHistory,
          minScore: minScore,
          avgScore: finalResults.length > 0
            ? (finalResults.reduce((sum, r) => sum + r.finalScore, 0) / finalResults.length).toFixed(3)
            : 0
        }
      };

      // Phase 3: Generate AI explanations for top results
      if (window.explanationService && window.explanationService.enabled && finalResults.length > 0) {
        try {
          console.log('💡 Generating match explanations...');
          const resultsWithExplanations = await window.explanationService.explainMatches(
            intent.originalQuery,
            finalResults,
            userContext
          );
          searchResult.results = resultsWithExplanations;
          console.log('✨ Match explanations added');
        } catch (error) {
          console.warn('Failed to generate explanations:', error);
          // Continue without explanations
        }
      }

      // Mark if this search was AI-enhanced for dynamic cache TTL
      const wasAIEnhanced = !!(this.lastAIInsights && this.lastAIInsights.themes);
      await this.cacheSearch(cacheKey, searchResult, wasAIEnhanced);

      // Phase 4: Track search analytics
      if (window.analyticsTracker) {
        window.analyticsTracker.trackSearch(intent.originalQuery, finalResults, {
          wasAIEnhanced,
          wasReranked: finalResults[0]?.wasReranked || false,
          hasExplanations: finalResults[0]?.hasExplanation || false,
          avgScore: searchResult.metadata.avgScore
        });
      }

      return searchResult;

    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  async findSimilar(bookTitle, bookAuthor, options = {}) {
    const query = `books like ${bookTitle} by ${bookAuthor}`;
    return this.search(query, options);
  }

  async getRecommendations(options = {}) {
    const userContext = await this.getUserContext();

    if (!userContext.hasHistory) {
      return this.search('popular highly rated fiction', options);
    }

    const genres = userContext.favoriteGenres.slice(0, 2).join(' ');
    const query = `${genres} highly rated`;

    return this.search(query, { ...options, boostUserPreference: true });
  }

  async getCachedSearch(key) {
    if (!this.embeddingCache) return null;

    return new Promise((resolve) => {
      const transaction = this.embeddingCache.transaction(['searches'], 'readonly');
      const store = transaction.objectStore('searches');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  async cacheSearch(key, results, wasAIEnhanced = false) {
    if (!this.embeddingCache) return;

    const transaction = this.embeddingCache.transaction(['searches'], 'readwrite');
    const store = transaction.objectStore('searches');
    store.put({
      query: key,
      results,
      timestamp: Date.now(),
      wasAIEnhanced  // Track if AI enhancement was used for dynamic TTL
    });
  }

  async clearOldCache(maxAge = 24 * 60 * 60 * 1000) {
    if (!this.embeddingCache) return;

    const cutoff = Date.now() - maxAge;
    const transaction = this.embeddingCache.transaction(['searches', 'embeddings'], 'readwrite');

    ['searches', 'embeddings'].forEach(storeName => {
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    });
  }

  // Phase 4: Pre-load common queries for instant results
  async preloadCommonQueries() {
    console.log('🚀 Pre-loading common queries...');

    try {
      // Get popular queries from analytics
      const popularQueries = this.getPopularQueries(5);
      const queriesToPreload = [...new Set([...this.commonQueries, ...popularQueries])].slice(0, 10);

      for (const query of queriesToPreload) {
        const cacheKey = `search_${query.toLowerCase().trim()}`;
        const cached = await this.getCachedSearch(cacheKey);

        // Only pre-load if not already cached or cache is stale
        if (!cached || Date.now() - cached.timestamp > 5 * 60 * 1000) {
          console.log(`  ⏳ Pre-loading: "${query}"`);
          // Don't await - run in background
          this.search(query, { maxResults: 30 }).catch(err => {
            console.warn(`  ⚠️ Failed to pre-load "${query}":`, err.message);
          });

          // Delay between queries to avoid overload
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`  ✓ Already cached: "${query}"`);
        }
      }

      console.log('✅ Pre-loading complete');
    } catch (error) {
      console.warn('⚠️ Pre-loading failed:', error);
    }
  }

  // Phase 4: Track search analytics
  async trackSearchQuery(query) {
    const normalized = query.toLowerCase().trim();
    const current = this.searchAnalytics.get(normalized) || { count: 0, lastSearched: 0 };

    this.searchAnalytics.set(normalized, {
      count: current.count + 1,
      lastSearched: Date.now()
    });

    // Persist to database via API
    try {
      if (typeof api !== 'undefined' && api.isAuthenticated()) {
        await api.trackSearchAnalytics(normalized);
      }
    } catch (error) {
      console.warn('Failed to track search analytics to database:', error);
    }
  }

  // Get most popular queries
  async getPopularQueries(limit = 10) {
    try {
      if (typeof api !== 'undefined' && api.isAuthenticated()) {
        const result = await api.getPopularQueries(limit);
        return result.queries || [];
      }
    } catch (error) {
      console.warn('Failed to get popular queries from database:', error);
    }

    // Fallback to local analytics
    const sorted = Array.from(this.searchAnalytics.entries())
      .sort((a, b) => {
        // Sort by count first, then by recency
        if (b[1].count !== a[1].count) {
          return b[1].count - a[1].count;
        }
        return b[1].lastSearched - a[1].lastSearched;
      })
      .slice(0, limit)
      .map(([query]) => query);

    return sorted;
  }

  // Load analytics from database
  async loadSearchAnalytics() {
    try {
      if (typeof api !== 'undefined' && api.isAuthenticated()) {
        const result = await api.getSearchAnalytics(100);
        if (result.analytics && Array.isArray(result.analytics)) {
          this.searchAnalytics.clear();
          result.analytics.forEach(item => {
            this.searchAnalytics.set(item.query, {
              count: item.count || 1,
              lastSearched: item.last_searched ? new Date(item.last_searched).getTime() : Date.now()
            });
          });
          console.log(`📊 Loaded ${this.searchAnalytics.size} search analytics entries from database`);
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load search analytics from database:', error);
    }
  }

  // Get analytics report
  async getAnalyticsReport() {
    try {
      if (typeof api !== 'undefined' && api.isAuthenticated()) {
        return await api.getAnalyticsReport();
      }
    } catch (error) {
      console.warn('Failed to get analytics report from database:', error);
    }

    // Fallback to local calculation
    const totalSearches = Array.from(this.searchAnalytics.values())
      .reduce((sum, entry) => sum + entry.count, 0);

    const topQueries = await this.getPopularQueries(10);

    const recentSearches = Array.from(this.searchAnalytics.entries())
      .sort((a, b) => b[1].lastSearched - a[1].lastSearched)
      .slice(0, 10)
      .map(([query, data]) => ({ query, ...data }));

    return {
      totalSearches,
      uniqueQueries: this.searchAnalytics.size,
      topQueries,
      recentSearches
    };
  }
}

const semanticSearch = new SemanticSearchEngine();

if (typeof window !== 'undefined') {
  window.semanticSearch = semanticSearch;
}