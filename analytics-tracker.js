/**
 * Analytics & Monitoring System
 * Tracks AI performance, API usage, user engagement, and system health
 *
 * Features:
 * - Search analytics (queries, results, click-through rates)
 * - API usage tracking (all services)
 * - Performance metrics (latency, cache hit rates)
 * - User engagement metrics (clicks, time on page)
 * - A/B testing framework
 */

class AnalyticsTracker {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();

    // Analytics storage
    this.events = [];
    this.searchMetrics = [];
    this.apiMetrics = [];
    this.performanceMetrics = [];

    // Load historical data from localStorage
    this.loadHistoricalData();

    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => this.saveToStorage(), 30000);

    console.log('📊 Analytics tracker initialized');
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load historical analytics data
   */
  loadHistoricalData() {
    try {
      const stored = localStorage.getItem('analytics_data');
      if (stored) {
        const data = JSON.parse(stored);

        // Only load data from last 7 days
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);

        this.searchMetrics = (data.searchMetrics || []).filter(m => m.timestamp > cutoff);
        this.apiMetrics = (data.apiMetrics || []).filter(m => m.timestamp > cutoff);
        this.performanceMetrics = (data.performanceMetrics || []).filter(m => m.timestamp > cutoff);

        console.log(`📦 Loaded analytics: ${this.searchMetrics.length} searches, ${this.apiMetrics.length} API calls`);
      }
    } catch (error) {
      console.warn('Failed to load analytics data:', error);
    }
  }

  /**
   * Save analytics to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        searchMetrics: this.searchMetrics,
        apiMetrics: this.apiMetrics,
        performanceMetrics: this.performanceMetrics,
        lastSaved: Date.now()
      };

      localStorage.setItem('analytics_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save analytics:', error);
    }
  }

  /**
   * Track search event
   */
  trackSearch(query, results, metadata = {}) {
    const searchEvent = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      query,
      resultCount: results.length,
      hasResults: results.length > 0,
      ...metadata
    };

    this.searchMetrics.push(searchEvent);

    // Track in session events
    this.events.push({
      type: 'search',
      ...searchEvent
    });
  }

  /**
   * Track API call
   */
  trackAPICall(service, endpoint, success, latency, metadata = {}) {
    const apiEvent = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      service, // 'gemini', 'cohere', 'hf'
      endpoint,
      success,
      latency, // milliseconds
      ...metadata
    };

    this.apiMetrics.push(apiEvent);
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric, value, context = {}) {
    const perfEvent = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metric, // e.g., 'search_latency', 'cache_hit_rate'
      value,
      ...context
    };

    this.performanceMetrics.push(perfEvent);
  }

  /**
   * Track user interaction (click, view, add to library)
   */
  trackInteraction(type, bookData, position, metadata = {}) {
    const interaction = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      type, // 'click', 'view_details', 'add_to_library'
      bookTitle: bookData.title,
      bookAuthor: bookData.author,
      position, // Position in search results
      ...metadata
    };

    this.events.push(interaction);
  }

  /**
   * Get analytics summary
   */
  getSummary(timeRange = '24h') {
    const cutoff = this.getTimeCutoff(timeRange);

    // Filter metrics by time range
    const searches = this.searchMetrics.filter(m => m.timestamp > cutoff);
    const apiCalls = this.apiMetrics.filter(m => m.timestamp > cutoff);
    const perfMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);

    return {
      timeRange,
      searches: {
        total: searches.length,
        withResults: searches.filter(s => s.hasResults).length,
        avgResultCount: searches.length > 0
          ? searches.reduce((sum, s) => sum + s.resultCount, 0) / searches.length
          : 0,
        aiEnhanced: searches.filter(s => s.wasAIEnhanced).length,
        reranked: searches.filter(s => s.wasReranked).length,
        hasExplanations: searches.filter(s => s.hasExplanations).length
      },
      api: {
        total: apiCalls.length,
        byService: this.groupBy(apiCalls, 'service'),
        successRate: apiCalls.length > 0
          ? (apiCalls.filter(c => c.success).length / apiCalls.length) * 100
          : 100,
        avgLatency: apiCalls.length > 0
          ? apiCalls.reduce((sum, c) => sum + c.latency, 0) / apiCalls.length
          : 0
      },
      performance: {
        avgSearchLatency: this.getAverageMetric(perfMetrics, 'search_latency'),
        cacheHitRate: this.getAverageMetric(perfMetrics, 'cache_hit_rate'),
        explanationLatency: this.getAverageMetric(perfMetrics, 'explanation_latency')
      },
      quota: this.getQuotaStatus()
    };
  }

  /**
   * Get time cutoff for time range
   */
  getTimeCutoff(timeRange) {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    return now - (ranges[timeRange] || ranges['24h']);
  }

  /**
   * Group array by property
   */
  groupBy(array, property) {
    return array.reduce((acc, item) => {
      const key = item[property];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get average for specific metric
   */
  getAverageMetric(metrics, metricName) {
    const filtered = metrics.filter(m => m.metric === metricName);
    if (filtered.length === 0) return 0;

    return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
  }

  /**
   * Get current API quota status
   */
  getQuotaStatus() {
    const status = {};

    if (window.geminiEnhancer?.enabled) {
      status.gemini = window.geminiEnhancer.getQuotaStatus();
    }

    if (window.cohereReranker?.enabled) {
      status.cohere = window.cohereReranker.getQuotaStatus();
    }

    if (window.hfEmbeddings?.enabled) {
      status.hf = window.hfEmbeddings.getQuotaStatus();
    }

    return status;
  }

  /**
   * Get search trends
   */
  getSearchTrends(timeRange = '7d') {
    const cutoff = this.getTimeCutoff(timeRange);
    const searches = this.searchMetrics.filter(m => m.timestamp > cutoff);

    // Group by day
    const byDay = {};
    searches.forEach(search => {
      const day = new Date(search.timestamp).toDateString();
      if (!byDay[day]) {
        byDay[day] = { count: 0, withAI: 0, withRerank: 0 };
      }
      byDay[day].count++;
      if (search.wasAIEnhanced) byDay[day].withAI++;
      if (search.wasReranked) byDay[day].withRerank++;
    });

    return byDay;
  }

  /**
   * Get top queries
   */
  getTopQueries(limit = 10, timeRange = '7d') {
    const cutoff = this.getTimeCutoff(timeRange);
    const searches = this.searchMetrics.filter(m => m.timestamp > cutoff);

    const queryCounts = {};
    searches.forEach(search => {
      const query = search.query.toLowerCase();
      queryCounts[query] = (queryCounts[query] || 0) + 1;
    });

    return Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));
  }

  /**
   * Export analytics data
   */
  exportData(format = 'json') {
    const data = {
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      summary: this.getSummary('30d'),
      searches: this.searchMetrics,
      apiCalls: this.apiMetrics,
      performance: this.performanceMetrics,
      events: this.events
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    if (format === 'csv') {
      // Convert to CSV format
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Convert data to CSV
   */
  convertToCSV(data) {
    const searches = data.searches.map(s => ({
      timestamp: new Date(s.timestamp).toISOString(),
      query: s.query,
      resultCount: s.resultCount,
      hasResults: s.hasResults,
      wasAIEnhanced: s.wasAIEnhanced || false,
      wasReranked: s.wasReranked || false
    }));

    const headers = Object.keys(searches[0] || {}).join(',');
    const rows = searches.map(s => Object.values(s).join(',')).join('\n');

    return `${headers}\n${rows}`;
  }

  /**
   * Clear old data (> 30 days)
   */
  cleanOldData() {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);

    this.searchMetrics = this.searchMetrics.filter(m => m.timestamp > cutoff);
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);

    this.saveToStorage();
    console.log('🗑️ Cleaned old analytics data (>30 days)');
  }

  /**
   * Cleanup on page unload
   */
  cleanup() {
    clearInterval(this.autoSaveInterval);
    this.saveToStorage();
  }
}

/**
 * A/B Testing Framework
 */
class ABTestingFramework {
  constructor(analyticsTracker) {
    this.analytics = analyticsTracker;
    this.experiments = new Map();
    this.userVariants = new Map();

    // Load saved experiments
    this.loadExperiments();

    console.log('🧪 A/B testing framework initialized');
  }

  /**
   * Load saved experiments
   */
  loadExperiments() {
    try {
      const stored = localStorage.getItem('ab_experiments');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([id, experiment]) => {
          this.experiments.set(id, experiment);
        });
      }
    } catch (error) {
      console.warn('Failed to load experiments:', error);
    }
  }

  /**
   * Save experiments
   */
  saveExperiments() {
    try {
      const data = {};
      this.experiments.forEach((experiment, id) => {
        data[id] = experiment;
      });
      localStorage.setItem('ab_experiments', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save experiments:', error);
    }
  }

  /**
   * Create new experiment
   */
  createExperiment(id, config) {
    const experiment = {
      id,
      name: config.name,
      variants: config.variants, // e.g., ['control', 'treatment']
      split: config.split || 0.5, // 50/50 by default
      metrics: config.metrics || [], // Metrics to track
      startDate: Date.now(),
      active: true,
      results: {}
    };

    this.experiments.set(id, experiment);
    this.saveExperiments();

    console.log(`🧪 Created experiment: ${experiment.name}`);
    return experiment;
  }

  /**
   * Get user's variant for experiment
   */
  getUserVariant(experimentId, userId = null) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !experiment.active) {
      return 'control'; // Default to control if experiment not active
    }

    // Check if user already assigned
    const cacheKey = `${experimentId}_${userId || 'anonymous'}`;
    if (this.userVariants.has(cacheKey)) {
      return this.userVariants.get(cacheKey);
    }

    // Assign variant based on hash (deterministic)
    const hash = this.hashString(cacheKey);
    const variant = hash < experiment.split
      ? experiment.variants[1] || 'treatment'
      : experiment.variants[0] || 'control';

    this.userVariants.set(cacheKey, variant);

    return variant;
  }

  /**
   * Hash string to 0-1 range
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) / 2147483648;
  }

  /**
   * Track metric for experiment
   */
  trackMetric(experimentId, variant, metric, value) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    if (!experiment.results[variant]) {
      experiment.results[variant] = {};
    }

    if (!experiment.results[variant][metric]) {
      experiment.results[variant][metric] = [];
    }

    experiment.results[variant][metric].push({
      value,
      timestamp: Date.now()
    });

    this.saveExperiments();

    // Also track in analytics
    if (this.analytics) {
      this.analytics.trackPerformance(`ab_${experimentId}_${metric}`, value, {
        variant,
        experimentId
      });
    }
  }

  /**
   * Get experiment results
   */
  getResults(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const results = {};

    // Calculate statistics for each variant
    experiment.variants.forEach(variant => {
      const variantData = experiment.results[variant] || {};
      results[variant] = {};

      experiment.metrics.forEach(metric => {
        const values = (variantData[metric] || []).map(v => v.value);

        if (values.length > 0) {
          results[variant][metric] = {
            count: values.length,
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            stdDev: this.calculateStdDev(values)
          };
        }
      });
    });

    return {
      experiment,
      results,
      winner: this.determineWinner(results, experiment.metrics[0])
    };
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Determine winner (simple comparison)
   */
  determineWinner(results, primaryMetric) {
    const variants = Object.keys(results);
    if (variants.length < 2) return null;

    const values = variants.map(v => ({
      variant: v,
      mean: results[v][primaryMetric]?.mean || 0,
      count: results[v][primaryMetric]?.count || 0
    }));

    // Need at least 30 samples for statistical significance
    if (values.every(v => v.count < 30)) {
      return { winner: null, reason: 'Insufficient data (need 30+ samples)' };
    }

    // Find variant with highest mean
    const best = values.reduce((a, b) => a.mean > b.mean ? a : b);

    return {
      winner: best.variant,
      improvement: ((best.mean / values[0].mean - 1) * 100).toFixed(2) + '%',
      confidence: best.count >= 100 ? 'High' : best.count >= 50 ? 'Medium' : 'Low'
    };
  }

  /**
   * Stop experiment
   */
  stopExperiment(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.active = false;
      experiment.endDate = Date.now();
      this.saveExperiments();
      console.log(`🏁 Stopped experiment: ${experiment.name}`);
    }
  }
}

// Initialize on page load
window.analyticsTracker = new AnalyticsTracker();
window.abTesting = new ABTestingFramework(window.analyticsTracker);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.analyticsTracker) {
    window.analyticsTracker.cleanup();
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnalyticsTracker, ABTestingFramework };
}
