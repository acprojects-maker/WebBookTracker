// Configuration for frontend - environment-aware API URL
const CONFIG = {
  // Automatically detect the API URL based on the environment
  API_URL: (() => {
    // Check if we're on localhost (development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:9000';
    }

    // Production - replace this with your actual Render backend URL after deployment
    // Example: 'https://booktracker-api.onrender.com'
    return 'https://your-backend-url.onrender.com';
  })(),

  // API version
  API_VERSION: '2.0.0',

  // Timeout for API requests (in milliseconds)
  REQUEST_TIMEOUT: 30000,

  // Feature flags
  FEATURES: {
    AI_DISCOVERY: true,
    SEMANTIC_SEARCH: true,
    ACHIEVEMENTS: true,
    READING_LISTS: true
  }
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.APP_CONFIG = CONFIG;
}

// For module systems (if needed in the future)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
