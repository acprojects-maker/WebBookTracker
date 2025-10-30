// Use config.js for environment-aware API URL
const API_BASE_URL = (window.APP_CONFIG?.API_URL || 'http://localhost:9000') + '/api';

class BookTrackerAPI {
  constructor() {
    this.token = localStorage.getItem('booktracker_token');
  }

  
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    
    return data;
  }

  

  async register(username, email, password, yearlyGoal = 50) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ username, email, password, yearlyGoal })
    });

    const data = await this.handleResponse(response);
    this.token = data.token;
    localStorage.setItem('booktracker_token', data.token);
    localStorage.setItem('booktracker_user', JSON.stringify(data.user));
    return data;
  }

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email, password })
    });

    const data = await this.handleResponse(response);
    this.token = data.token;
    localStorage.setItem('booktracker_token', data.token);
    localStorage.setItem('booktracker_user', JSON.stringify(data.user));
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('booktracker_token');
    localStorage.removeItem('booktracker_user');
  }

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async updateProfile(username, yearlyGoal) {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ username, yearly_goal: yearlyGoal })
    });

    const data = await this.handleResponse(response);
    
    
    const user = JSON.parse(localStorage.getItem('booktracker_user'));
    if (username) user.username = username;
    if (yearlyGoal) user.yearlyGoal = yearlyGoal;
    localStorage.setItem('booktracker_user', JSON.stringify(user));
    
    return data;
  }

  isAuthenticated() {
    return !!this.token;
  }

  

  async getBooks(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.genre) params.append('genre', filters.genre);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `${API_BASE_URL}/books${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }

  async getBook(id) {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async addBook(bookData) {
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(bookData)
    });
    return this.handleResponse(response);
  }

  async updateBook(id, updates) {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    return this.handleResponse(response);
  }

  async deleteBook(id) {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  

  async getReadingSessions(bookId) {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/sessions`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async addReadingSession(bookId, sessionData) {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(sessionData)
    });
    return this.handleResponse(response);
  }

  

  async getStatistics() {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  

  async searchBooks(query) {
    const response = await fetch(`${API_BASE_URL}/search/books?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async searchBooksByISBN(isbn) {
    const response = await fetch(`${API_BASE_URL}/search/books?isbn=${encodeURIComponent(isbn)}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async searchBooksByGenre(genre) {
    const url = `${API_BASE_URL}/search/books?genre=${encodeURIComponent(genre)}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  

  
  async getSearchHistory(limit = 20) {
    const response = await fetch(`${API_BASE_URL}/discovery/search-history?limit=${limit}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async saveSearchHistory(query, resultsCount) {
    const response = await fetch(`${API_BASE_URL}/discovery/search-history`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, results_count: resultsCount })
    });
    return this.handleResponse(response);
  }

  
  async getSavedSearches() {
    const response = await fetch(`${API_BASE_URL}/discovery/saved-searches`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async saveSearch(searchData) {
    const response = await fetch(`${API_BASE_URL}/discovery/saved-searches`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(searchData)
    });
    return this.handleResponse(response);
  }

  async deleteSavedSearch(id) {
    const response = await fetch(`${API_BASE_URL}/discovery/saved-searches/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  
  async getDiscoveryPreferences() {
    const response = await fetch(`${API_BASE_URL}/discovery/preferences`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async updateDiscoveryPreferences(preferences) {
    const response = await fetch(`${API_BASE_URL}/discovery/preferences`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(preferences)
    });
    return this.handleResponse(response);
  }

  
  async getReadingLists() {
    const response = await fetch(`${API_BASE_URL}/discovery/reading-lists`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async createReadingList(listData) {
    const response = await fetch(`${API_BASE_URL}/discovery/reading-lists`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(listData)
    });
    return this.handleResponse(response);
  }

  async addToReadingList(listId, bookData) {
    const response = await fetch(`${API_BASE_URL}/discovery/reading-lists/${listId}/items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(bookData)
    });
    return this.handleResponse(response);
  }

  async deleteReadingList(id) {
    const response = await fetch(`${API_BASE_URL}/discovery/reading-lists/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }


  async trackInteraction(interactionData) {
    const response = await fetch(`${API_BASE_URL}/discovery/interactions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(interactionData)
    });
    return this.handleResponse(response);
  }

  // Search Analytics - Phase 4
  async trackSearchAnalytics(query) {
    const response = await fetch(`${API_BASE_URL}/analytics/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query })
    });
    return this.handleResponse(response);
  }

  async getSearchAnalytics(limit = 100) {
    const response = await fetch(`${API_BASE_URL}/analytics/search?limit=${limit}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getPopularQueries(limit = 10) {
    const response = await fetch(`${API_BASE_URL}/analytics/search/popular?limit=${limit}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getAnalyticsReport() {
    const response = await fetch(`${API_BASE_URL}/analytics/report`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Session Click Data - Phase 3
  async saveSessionClick(clickData) {
    const response = await fetch(`${API_BASE_URL}/analytics/clicks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(clickData)
    });
    return this.handleResponse(response);
  }

  async getSessionClicks(sessionId = null) {
    const url = sessionId
      ? `${API_BASE_URL}/analytics/clicks?session=${sessionId}`
      : `${API_BASE_URL}/analytics/clicks`;

    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getRecentClicks(limit = 10) {
    const response = await fetch(`${API_BASE_URL}/analytics/clicks/recent?limit=${limit}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }


  async getRecommendations() {
    const response = await fetch(`${API_BASE_URL}/discovery/recommendations`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  

  
  async getAchievements(year = null) {
    const url = year
      ? `${API_BASE_URL}/achievements?year=${year}`
      : `${API_BASE_URL}/achievements`;

    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  
  async getAchievementsHistory() {
    const response = await fetch(`${API_BASE_URL}/achievements/history`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  
  async saveAchievements(achievementCodes) {
    const response = await fetch(`${API_BASE_URL}/achievements`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ achievements: achievementCodes })
    });
    return this.handleResponse(response);
  }

  
  async unlockAchievement(achievementCode) {
    const response = await fetch(`${API_BASE_URL}/achievements/unlock`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ achievement_code: achievementCode })
    });
    return this.handleResponse(response);
  }
}


const api = new BookTrackerAPI();


if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookTrackerAPI;
}