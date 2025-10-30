let currentResults = [];
let displayedResults = [];
let currentQuery = '';
let currentSearchId = null;
let isSearching = false;
let currentView = 'grid';
let resultsPerPage = 24;
let currentPage = 1;


let activeFilters = {
  sort: 'relevance',
  bookLength: 'any',
  minRating: 0,
  decade: 'any',
  minPages: null,
  maxPages: null,
  excludedGenres: [],
  excludedAuthors: []
};


let userPreferences = {
  excluded_genres: [],
  excluded_authors: []
};


function checkAuth() {
  if (!api.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}


function initTheme() {
  const savedTheme = localStorage.getItem('bookTrackerTheme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }
  updateThemeIcon();
}

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  localStorage.setItem('bookTrackerTheme', currentTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
  }
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    api.logout();
    window.location.href = 'login.html';
  }
}


async function initializeAI() {
  const aiLoadingState = document.getElementById('ai-loading-state');
  const emptyState = document.getElementById('empty-state');

  try {
    aiLoadingState.style.display = 'block';
    emptyState.style.display = 'none';

    await semanticSearch.initialize();

    aiLoadingState.style.display = 'none';
    emptyState.style.display = 'block';

    console.log('✅ AI Discovery ready!');
  } catch (error) {
    console.error('Failed to initialize AI:', error);
    aiLoadingState.style.display = 'none';
    showNotification('AI initialization failed. Using basic search.', 'error');
    emptyState.style.display = 'block';
  }
}


async function loadUserPreferences() {
  try {
    const prefs = await api.getDiscoveryPreferences();
    userPreferences = prefs;
    activeFilters.excludedGenres = prefs.excluded_genres || [];
    activeFilters.excludedAuthors = prefs.excluded_authors || [];
    renderExcludedChips();
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
}


async function loadSearchHistory() {
  try {
    const history = await api.getSearchHistory(10);
    return history;
  } catch (error) {
    console.error('Failed to load search history:', error);
    return [];
  }
}


async function showSearchHistory() {
  const dropdown = document.getElementById('search-history-dropdown');
  const list = document.getElementById('search-history-list');
  
  const history = await loadSearchHistory();
  
  if (history.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No recent searches</div>';
  } else {
    list.innerHTML = history.map(h => {
      const timeAgo = getTimeAgo(new Date(h.created_at));
      return `
        <div class="history-item" onclick="quickSearch('${h.query.replace(/'/g, "\\'")}')">
          <span class="history-item-text">${h.query}</span>
          <span class="history-item-time">${timeAgo}</span>
        </div>
      `;
    }).join('');
  }
  
  dropdown.style.display = 'block';
  
  
  setTimeout(() => {
    document.addEventListener('click', closeSearchHistoryOnClickOutside);
  }, 100);
}

function closeSearchHistory() {
  document.getElementById('search-history-dropdown').style.display = 'none';
  document.removeEventListener('click', closeSearchHistoryOnClickOutside);
}

function closeSearchHistoryOnClickOutside(e) {
  const dropdown = document.getElementById('search-history-dropdown');
  const input = document.getElementById('discover-search-input');
  if (!dropdown.contains(e.target) && e.target !== input) {
    closeSearchHistory();
  }
}


function handleDiscoverSearchKeypress(event) {
  if (event.key === 'Enter') {
    performDiscoverSearch();
  }
  
  
  const input = document.getElementById('discover-search-input');
  const clearBtn = document.getElementById('clear-search-btn');
  clearBtn.style.display = input.value ? 'flex' : 'none';
}


function clearSearch() {
  document.getElementById('discover-search-input').value = '';
  document.getElementById('clear-search-btn').style.display = 'none';
  document.getElementById('discover-search-input').focus();
}


function quickSearch(query) {
  document.getElementById('discover-search-input').value = query;
  closeSearchHistory();
  performDiscoverSearch();
}


function toggleFilters() {
  const panel = document.getElementById('filters-panel');
  const btn = document.querySelector('.filters-toggle-btn');
  
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'block';
    btn.classList.add('active');
  } else {
    panel.style.display = 'none';
    btn.classList.remove('active');
  }
}


function selectLength(length) {
  activeFilters.bookLength = length;
  document.querySelectorAll('.length-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.length === length);
  });
}

function resetFilters() {
  activeFilters = {
    sort: 'relevance',
    bookLength: 'any',
    minRating: 0,
    decade: 'any',
    minPages: null,
    maxPages: null,
    excludedGenres: userPreferences.excluded_genres || [],
    excludedAuthors: userPreferences.excluded_authors || []
  };
  
  document.getElementById('filter-sort').value = 'relevance';
  document.getElementById('filter-min-rating').value = '0';
  document.getElementById('filter-decade').value = 'any';
  document.getElementById('filter-min-pages').value = '';
  document.getElementById('filter-max-pages').value = '';
  
  selectLength('any');
  renderExcludedChips();
  updateActiveFiltersDisplay();
}

function applyFilters() {
  activeFilters.sort = document.getElementById('filter-sort').value;
  activeFilters.minRating = parseFloat(document.getElementById('filter-min-rating').value);
  activeFilters.decade = document.getElementById('filter-decade').value;
  activeFilters.minPages = document.getElementById('filter-min-pages').value ? 
    parseInt(document.getElementById('filter-min-pages').value) : null;
  activeFilters.maxPages = document.getElementById('filter-max-pages').value ? 
    parseInt(document.getElementById('filter-max-pages').value) : null;
  
  updateActiveFiltersDisplay();
  
  if (currentResults.length > 0) {
    applyFiltersToResults();
  }
  
  showNotification('Filters applied successfully', 'success');
}

function applyFiltersToResults() {
  let filtered = [...currentResults];
  
  
  filtered = filtered.filter(book => {
    if (activeFilters.excludedGenres.includes(book.genre)) return false;
    if (activeFilters.excludedAuthors.includes(book.author)) return false;
    return true;
  });
  
  
  if (activeFilters.minRating > 0) {
    filtered = filtered.filter(book => !book.rating || book.rating >= activeFilters.minRating);
  }
  
  
  if (activeFilters.minPages) {
    filtered = filtered.filter(book => book.pages >= activeFilters.minPages);
  }
  if (activeFilters.maxPages) {
    filtered = filtered.filter(book => book.pages <= activeFilters.maxPages);
  }
  
  
  if (activeFilters.bookLength !== 'any') {
    filtered = filtered.filter(book => {
      const pages = book.pages || 0;
      if (activeFilters.bookLength === 'short') return pages < 200;
      if (activeFilters.bookLength === 'medium') return pages >= 200 && pages <= 400;
      if (activeFilters.bookLength === 'long') return pages > 400;
      return true;
    });
  }
  
  
  if (activeFilters.decade !== 'any') {
    const decade = parseInt(activeFilters.decade);
    filtered = filtered.filter(book => {
      if (!book.publishedDate) return true;
      const year = parseInt(book.publishedDate.substring(0, 4));
      return year >= decade && year < decade + 10;
    });
  }
  
  
  filtered = sortResults(filtered, activeFilters.sort);
  
  displayedResults = filtered;
  currentPage = 1;
  renderResults();
}

function sortResults(results, sortBy) {
  const sorted = [...results];
  
  switch (sortBy) {
    case 'popular':
      return sorted.sort((a, b) => b.finalScore - a.finalScore);
    
    case 'newest':
      return sorted.sort((a, b) => {
        const yearA = parseInt(a.publishedDate?.substring(0, 4) || '0');
        const yearB = parseInt(b.publishedDate?.substring(0, 4) || '0');
        return yearB - yearA;
      });
    
    case 'highest_rated':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    case 'shortest':
      return sorted.sort((a, b) => (a.pages || 0) - (b.pages || 0));
    
    case 'longest':
      return sorted.sort((a, b) => (b.pages || 0) - (a.pages || 0));
    
    case 'relevance':
    default:
      return sorted.sort((a, b) => b.finalScore - a.finalScore);
  }
}

function updateActiveFiltersDisplay() {
  const display = document.getElementById('active-filters-display');
  const tagsContainer = document.getElementById('active-filters-tags');
  const filters = [];
  
  if (activeFilters.bookLength !== 'any') filters.push(`Length: ${activeFilters.bookLength}`);
  if (activeFilters.minRating > 0) filters.push(`Min Rating: ${activeFilters.minRating}★`);
  if (activeFilters.decade !== 'any') filters.push(`Decade: ${activeFilters.decade}s`);
  if (activeFilters.minPages) filters.push(`Min Pages: ${activeFilters.minPages}`);
  if (activeFilters.maxPages) filters.push(`Max Pages: ${activeFilters.maxPages}`);
  if (activeFilters.excludedGenres.length > 0) filters.push(`Excluded: ${activeFilters.excludedGenres.length} genres`);
  if (activeFilters.excludedAuthors.length > 0) filters.push(`Excluded: ${activeFilters.excludedAuthors.length} authors`);
  
  display.textContent = filters.length > 0 ? filters.join(' • ') : 'No filters active';
  
  
  if (tagsContainer) {
    tagsContainer.innerHTML = filters.map(f => `
      <span class="filter-tag">${f}</span>
    `).join('');
  }
}

function renderExcludedChips() {
  const genresContainer = document.getElementById('excluded-genres-chips');
  const authorsContainer = document.getElementById('excluded-authors-chips');
  
  genresContainer.innerHTML = activeFilters.excludedGenres.map(genre => `
    <span class="chip">
      ${genre}
      <button class="chip-remove" onclick="removeExcludedGenre('${genre}')">✕</button>
    </span>
  `).join('') || '<span style="color: var(--text-secondary); font-size: 13px;">No genres excluded</span>';
  
  authorsContainer.innerHTML = activeFilters.excludedAuthors.map(author => `
    <span class="chip">
      ${author}
      <button class="chip-remove" onclick="removeExcludedAuthor('${author.replace(/'/g, "\\'")}')">✕</button>
    </span>
  `).join('') || '<span style="color: var(--text-secondary); font-size: 13px;">No authors excluded</span>';
}

function removeExcludedGenre(genre) {
  activeFilters.excludedGenres = activeFilters.excludedGenres.filter(g => g !== genre);
  renderExcludedChips();
}

function removeExcludedAuthor(author) {
  activeFilters.excludedAuthors = activeFilters.excludedAuthors.filter(a => a !== author);
  renderExcludedChips();
}

function showGenreExcludeModal() {
  const genre = prompt('Enter genre to exclude (e.g., Horror, Romance):');
  if (genre && genre.trim()) {
    const trimmed = genre.trim();
    if (!activeFilters.excludedGenres.includes(trimmed)) {
      activeFilters.excludedGenres.push(trimmed);
      renderExcludedChips();
    }
  }
}

function showAuthorExcludeModal() {
  const author = prompt('Enter author to exclude:');
  if (author && author.trim()) {
    const trimmed = author.trim();
    if (!activeFilters.excludedAuthors.includes(trimmed)) {
      activeFilters.excludedAuthors.push(trimmed);
      renderExcludedChips();
    }
  }
}

async function saveCurrentSearch() {
  const name = prompt('Name this search:');
  if (!name || !name.trim()) return;
  
  try {
    await api.saveSearch({
      name: name.trim(),
      query: currentQuery,
      min_rating: activeFilters.minRating,
      max_pages: activeFilters.maxPages,
      min_pages: activeFilters.minPages,
      publication_year_start: activeFilters.decade !== 'any' ? parseInt(activeFilters.decade) : null,
      publication_year_end: activeFilters.decade !== 'any' ? parseInt(activeFilters.decade) + 9 : null,
      sort_by: activeFilters.sort,
      book_length: activeFilters.bookLength,
      genres: [],
      excluded_authors: activeFilters.excludedAuthors
    });
    
    showNotification('✅ Search saved successfully!', 'success');
  } catch (error) {
    console.error('Failed to save search:', error);
    showNotification('Failed to save search', 'error');
  }
}


async function showSavedSearches() {
  try {
    const saved = await api.getSavedSearches();
    
    if (saved.length === 0) {
      showNotification('No saved searches yet', 'info');
      return;
    }
    
    const list = document.getElementById('search-history-list');
    list.innerHTML = saved.map(s => `
      <div class="history-item" onclick="loadSavedSearch(${s.id})">
        <span class="history-item-text">📌 ${s.name}</span>
        <button onclick="event.stopPropagation(); deleteSavedSearch(${s.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;">✕</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load saved searches:', error);
  }
}

async function loadSavedSearch(id) {
  try {
    const saved = await api.getSavedSearches();
    const search = saved.find(s => s.id === id);
    if (!search) return;
    
    document.getElementById('discover-search-input').value = search.query;
    
    
    activeFilters.minRating = search.min_rating || 0;
    activeFilters.maxPages = search.max_pages;
    activeFilters.minPages = search.min_pages;
    activeFilters.bookLength = search.book_length || 'any';
    activeFilters.sort = search.sort_by || 'relevance';
    activeFilters.excludedAuthors = search.excluded_authors || [];
    
    if (search.publication_year_start) {
      activeFilters.decade = search.publication_year_start.toString();
    }
    
    closeSearchHistory();
    performDiscoverSearch();
  } catch (error) {
    console.error('Failed to load saved search:', error);
  }
}

async function deleteSavedSearch(id) {
  if (!confirm('Delete this saved search?')) return;
  
  try {
    await api.deleteSavedSearch(id);
    showNotification('Saved search deleted', 'success');
    showSavedSearches();
  } catch (error) {
    console.error('Failed to delete saved search:', error);
    showNotification('Failed to delete search', 'error');
  }
}


async function performDiscoverSearch() {
  if (isSearching) return;

  const input = document.getElementById('discover-search-input');
  const query = input.value.trim();

  if (!query) {
    showNotification('Please enter a search query', 'error');
    return;
  }

  currentQuery = query;
  isSearching = true;

  
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('search-info').style.display = 'none';
  document.getElementById('results-container').innerHTML = '';
  document.getElementById('search-loading-state').style.display = 'block';
  document.getElementById('load-more-container').style.display = 'none';

  const loadingStatus = document.getElementById('loading-status');
  const loadingDetail = document.getElementById('loading-detail');
  const searchBtn = document.getElementById('discover-search-btn');

  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';

  try {
    loadingStatus.textContent = '🧠 Understanding your query...';
    loadingDetail.textContent = 'Using AI to extract themes, genres, and preferences';
    await new Promise(resolve => setTimeout(resolve, 500));

    loadingStatus.textContent = '🎯 Building search strategies...';
    loadingDetail.textContent = 'Creating intelligent queries for best results';
    await new Promise(resolve => setTimeout(resolve, 500));

    loadingStatus.textContent = '🌐 Searching millions of books...';
    loadingDetail.textContent = 'Querying Google Books API';

    const searchResults = await semanticSearch.search(query, { maxResults: 100 });

    loadingStatus.textContent = '🧮 Ranking with AI...';
    loadingDetail.textContent = 'Scoring results based on semantic similarity';
    await new Promise(resolve => setTimeout(resolve, 300));

    currentResults = searchResults.results;
    displayedResults = [...currentResults];
    
    
    applyFiltersToResults();

    document.getElementById('search-loading-state').style.display = 'none';
    
    
    try {
      const result = await api.saveSearchHistory(query, currentResults.length);
      currentSearchId = result.id;
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
    
    renderResults();

  } catch (error) {
    console.error('Search failed:', error);
    document.getElementById('search-loading-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    showNotification('Search failed. Please try again.', 'error');
  } finally {
    isSearching = false;
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}


function cancelSearch() {
  isSearching = false;
  document.getElementById('search-loading-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('discover-search-btn').disabled = false;
  document.getElementById('discover-search-btn').textContent = 'Search';
}


function renderResults(scrollToTop = true) {
  const resultsContainer = document.getElementById('results-container');
  const searchInfo = document.getElementById('search-info');
  const resultsTitle = document.getElementById('results-title');
  const resultsSubtitle = document.getElementById('results-subtitle');
  const statTotal = document.getElementById('stat-total');
  const statMatch = document.getElementById('stat-match');
  const loadMoreContainer = document.getElementById('load-more-container');

  if (displayedResults.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('empty-state').querySelector('h3').textContent = 'No Results Found';
    document.getElementById('empty-state').querySelector('p').textContent =
      `We couldn't find any books matching "${currentQuery}" with your current filters. Try adjusting your filters.`;
    return;
  }

  searchInfo.style.display = 'block';
  resultsTitle.textContent = `Results for "${currentQuery}"`;
  resultsSubtitle.textContent = `Found ${displayedResults.length} books`;

  statTotal.textContent = displayedResults.length;
  const avgMatch = Math.round((displayedResults.reduce((sum, r) => sum + r.finalScore, 0) / displayedResults.length) * 100);
  statMatch.textContent = `${avgMatch}%`;

  // Store current scroll position before re-rendering (for load more)
  const previousEndIndex = (currentPage - 1) * resultsPerPage;
  const scrollAnchor = previousEndIndex > 0 ? resultsContainer.children[previousEndIndex - 1] : null;

  resultsContainer.innerHTML = '';
  resultsContainer.className = `results-grid ${currentView}-view`;

  const endIndex = currentPage * resultsPerPage;
  const pageResults = displayedResults.slice(0, endIndex);

  pageResults.forEach((book, index) => {
    const card = createDiscoverCard(book, index);
    resultsContainer.appendChild(card);
  });


  if (displayedResults.length > endIndex) {
    loadMoreContainer.style.display = 'block';
  } else {
    loadMoreContainer.style.display = 'none';
  }

  // Only scroll to top on new search, not on load more
  if (scrollToTop && currentPage === 1) {
    setTimeout(() => {
      searchInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } else if (scrollAnchor) {
    // When loading more, scroll to where the new content starts
    setTimeout(() => {
      const newScrollTarget = resultsContainer.children[previousEndIndex];
      if (newScrollTarget) {
        newScrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}


function loadMoreResults() {
  currentPage++;
  renderResults(false); // Don't scroll to top when loading more
}


function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  renderResults();
}


function createDiscoverCard(book, index) {
  const card = document.createElement('div');
  card.className = 'discover-card';
  card.style.animation = `fadeInUp 0.4s ease ${index * 0.03}s both`;

  const matchPercentage = Math.round(book.finalScore * 100);
  const coverUrl = book.coverUrl || book.cover || 'https://via.placeholder.com/220x280/667eea/ffffff?text=No+Cover';

  const topReasons = book.matchReasons.slice(0, 3);

  card.innerHTML = `
    <div class="match-score" onclick="event.stopPropagation()">
      ${matchPercentage}% Match
      <div class="match-score-tooltip">
        <div class="score-breakdown">
          <div class="score-item">
            <span class="score-label">Semantic</span>
            <div class="score-bar-container">
              <div class="score-bar" style="width: ${book.similarityScore * 100}%"></div>
            </div>
            <span class="score-value">${Math.round(book.similarityScore * 100)}%</span>
          </div>
          ${book.userPreferenceScore > 0 ? `
            <div class="score-item">
              <span class="score-label">Your Taste</span>
              <div class="score-bar-container">
                <div class="score-bar" style="width: ${book.userPreferenceScore * 100}%"></div>
              </div>
              <span class="score-value">${Math.round(book.userPreferenceScore * 100)}%</span>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
    <img src="${coverUrl}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/220x280/667eea/ffffff?text=No+Cover'" loading="lazy">
    <h3 title="${book.title}">${book.title}</h3>
    <p class="author" title="${book.author}">${book.author}</p>
    
    <div class="match-reasons">
      ${topReasons.map(reason => `
        <div class="match-reason">${reason}</div>
      `).join('')}
    </div>

    ${book.hasExplanation && book.matchExplanation ? `
      <div class="ai-explanation">
        <div class="ai-badge">✨ AI Insight</div>
        <p>${book.matchExplanation}</p>
      </div>
    ` : ''}

    <div class="card-actions">
      <button class="add-to-library-btn" onclick="event.stopPropagation(); showAddBookModal(${index})">
        ➕ Add to Library
      </button>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (!e.target.closest('.add-to-library-btn') && !e.target.closest('.match-score')) {
      showBookDetails(book);
      // Track click with search context for learning
      trackClickThrough(book, index);
    }
  });

  return card;
}


// Enhanced click-through tracking for learning user preferences
async function trackClickThrough(book, position) {
  try {
    // Track interaction with detailed context
    await api.trackInteraction({
      book_title: book.title,
      book_author: book.author,
      book_isbn: book.isbn,
      book_genre: book.genre,
      interaction_type: 'clicked',
      search_id: currentSearchId,
      search_query: currentQuery,
      result_position: position + 1,
      match_score: book.finalScore,
      similarity_score: book.similarityScore,
      user_preference_score: book.userPreferenceScore
    });

    // Save click data to database for session learning
    const clickData = {
      timestamp: Date.now(),
      book_title: book.title,
      book_author: book.author,
      book_genre: book.genre,
      book_pages: book.pages,
      position: position + 1,
      search_query: currentQuery,
      match_score: book.finalScore,
      search_id: currentSearchId
    };

    // Save to database
    await api.saveSessionClick(clickData);

    // Also store in session for immediate preference adjustment
    if (!window.sessionClickData) {
      window.sessionClickData = [];
    }

    window.sessionClickData.push({
      timestamp: Date.now(),
      book: {
        title: book.title,
        author: book.author,
        genre: book.genre,
        pages: book.pages
      },
      position,
      query: currentQuery,
      matchScore: book.finalScore
    });

    console.log('📊 Click tracked:', {
      book: book.title,
      position: position + 1,
      query: currentQuery,
      matchScore: (book.finalScore * 100).toFixed(1) + '%'
    });

  } catch (error) {
    console.error('Failed to track click-through:', error);
  }
}


// Legacy interaction tracking (kept for backward compatibility)
async function trackInteraction(book, type) {
  try {
    await api.trackInteraction({
      book_title: book.title,
      book_author: book.author,
      book_isbn: book.isbn,
      book_genre: book.genre,
      interaction_type: type,
      search_id: currentSearchId,
      search_query: currentQuery
    });
  } catch (error) {
    console.error('Failed to track interaction:', error);
  }
}


function showBookDetails(book) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="max-width: 900px;">
      <div class="modal-header">
        <h2>📖 Book Details</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      
      <div class="modal-body" style="padding: 40px;">
        <div style="display: flex; gap: 30px; margin-bottom: 30px;">
          <img src="${book.coverUrl || book.cover || 'https://via.placeholder.com/140x200?text=No+Cover'}" 
               alt="${book.title}" 
               style="width: 180px; height: 260px; object-fit: cover; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          
          <div style="flex: 1;">
            <h3 style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">${book.title}</h3>
            <p style="font-size: 18px; color: var(--text-secondary); margin-bottom: 20px;">by ${book.author}</p>
            
            <div style="display: grid; gap: 12px; margin-bottom: 20px;">
              ${book.pages ? `<p><strong>📄 Pages:</strong> ${book.pages}</p>` : ''}
              ${book.genre ? `<p><strong>🎭 Genre:</strong> ${book.genre}</p>` : ''}
              ${book.publisher ? `<p><strong>📚 Publisher:</strong> ${book.publisher}</p>` : ''}
              ${book.publishedDate ? `<p><strong>📅 Published:</strong> ${book.publishedDate}</p>` : ''}
            </div>
            
            <div style="padding: 16px; background: rgba(99, 102, 241, 0.1); border-radius: 12px; margin-bottom: 20px;">
              <strong style="color: var(--accent-primary); display: block; margin-bottom: 10px;">✨ Why this match?</strong>
              ${book.matchReasons.map(reason => `
                <div style="font-size: 14px; margin-top: 8px; padding-left: 8px; border-left: 3px solid var(--accent-primary);">${reason}</div>
              `).join('')}
            </div>

            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <a href="https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + book.author)}" 
                 target="_blank" class="btn-secondary" style="text-decoration: none; display: inline-block;">
                🔍 Google Search
              </a>
              <a href="https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + book.author)}" 
                 target="_blank" class="btn-secondary" style="text-decoration: none; display: inline-block;">
                📚 Goodreads
              </a>
            </div>
          </div>
        </div>
        
        ${book.description ? `
          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: var(--accent-primary);">📝 Description</h4>
            <p style="line-height: 1.8; color: var(--text-primary);">${book.description}</p>
          </div>
        ` : ''}
      </div>
      
      <div class="modal-footer">
        <button class="btn-modal-cancel" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn-modal-save" onclick="addBookFromDetailsModal(${JSON.stringify(book).replace(/"/g, '&quot;')})">
          ➕ Add to Library
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.classList.remove('modal-open');
    }
  });
}


function showAddBookModal(index) {
  const book = displayedResults[index];
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="max-width: 600px;">
      <div class="modal-header">
        <h2>➕ Add to Library</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      
      <div class="modal-body" style="padding: 30px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${book.coverUrl || book.cover}" alt="${book.title}" 
               style="width: 120px; height: 170px; object-fit: cover; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          <h3 style="margin-top: 16px; font-size: 18px;">${book.title}</h3>
          <p style="color: var(--text-secondary);">${book.author}</p>
        </div>
        
        <div class="form-group">
          <label>📊 Reading Status <span style="color: #ef4444;">*</span></label>
          <div class="status-buttons" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px;">
            <button type="button" class="status-btn active" data-status="Want to Read" onclick="selectAddStatus(this, 'Want to Read')">
              <span style="font-size: 24px;">📚</span>
              <span style="font-size: 14px; font-weight: 700;">Want to Read</span>
            </button>
            <button type="button" class="status-btn" data-status="Currently Reading" onclick="selectAddStatus(this, 'Currently Reading')">
              <span style="font-size: 24px;">📖</span>
              <span style="font-size: 14px; font-weight: 700;">Reading</span>
            </button>
            <button type="button" class="status-btn" data-status="Finished" onclick="selectAddStatus(this, 'Finished')">
              <span style="font-size: 24px;">✅</span>
              <span style="font-size: 14px; font-weight: 700;">Finished</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-modal-cancel" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-modal-save" onclick="addBookToLibrary(${index})">
          ➕ Add Book
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  modal.dataset.selectedStatus = 'Want to Read';
}


function selectAddStatus(button, status) {
  const modal = button.closest('.modal-overlay');
  modal.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  modal.dataset.selectedStatus = status;
}


async function addBookToLibrary(index) {
  const book = displayedResults[index];
  const modal = document.querySelector('.modal-overlay');
  const status = modal.dataset.selectedStatus || 'Want to Read';
  const saveBtn = modal.querySelector('.btn-modal-save');

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="loading-spinner"></span> Adding...';

  try {
    const bookData = {
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      pages: book.pages || 0,
      description: book.description || '',
      publisher: book.publisher || '',
      publishedDate: book.publishedDate || '',
      coverUrl: book.coverUrl || book.cover,
      genre: book.genre || 'Unknown',
      status: status,
      progress: 0,
      rating: null,
      readingTime: 0
    };

    await api.addBook(bookData);
    
    
    trackInteraction(book, 'added');

    showToast('✅ Book added to your library!', 'success', 'View Library', () => {
      window.location.href = 'library.html';
    });
    
    modal.remove();
    document.body.classList.remove('modal-open');

  } catch (error) {
    console.error('Failed to add book:', error);
    showNotification('Failed to add book. Please try again.', 'error');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '➕ Add Book';
  }
}


function addBookFromDetailsModal(bookData) {
  const book = typeof bookData === 'string' ? JSON.parse(bookData.replace(/&quot;/g, '"')) : bookData;
  document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
  const bookIndex = displayedResults.findIndex(b => b.title === book.title && b.author === book.author);
  if (bookIndex >= 0) {
    showAddBookModal(bookIndex);
  }
}


async function loadPersonalizedRecommendations() {
  try {
    const recs = await api.getRecommendations();
    if (!recs.favorite_genres || recs.favorite_genres.length === 0) return;
    
    const query = recs.recommendation_query;
    const results = await semanticSearch.search(query, { maxResults: 12 });
    
    const forYouSection = document.getElementById('for-you-section');
    const carousel = document.getElementById('for-you-carousel');
    
    carousel.innerHTML = results.results.slice(0, 6).map(book => `
      <div class="for-you-card" onclick='showBookDetails(${JSON.stringify(book).replace(/'/g, "\\'")})'}>
        <img src="${book.coverUrl || book.cover}" alt="${book.title}">
        <h4>${book.title}</h4>
        <p>${book.author}</p>
      </div>
    `).join('');
    
    forYouSection.style.display = 'block';
  } catch (error) {
    console.error('Failed to load recommendations:', error);
  }
}


function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    font-weight: 600;
    max-width: 400px;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showToast(message, type, actionText, actionCallback) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    ${actionText ? `<button class="toast-action">${actionText}</button>` : ''}
  `;
  
  if (actionText && actionCallback) {
    const button = toast.querySelector('.toast-action');
    button.addEventListener('click', () => {
      toast.remove();
      actionCallback();
    });
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}


function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return 'Just now';
}


document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    closeSearchHistory();
    const filtersPanel = document.getElementById('filters-panel');
    if (filtersPanel && filtersPanel.style.display !== 'none') {
      toggleFilters();
    }
  }
  
  if (e.key === '/' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    document.getElementById('discover-search-input').focus();
  }
});


async function initDiscoverPage() {
  if (!checkAuth()) return;

  initTheme();
  await loadUserPreferences();
  updateActiveFiltersDisplay();
  renderExcludedChips();
  
  
  initializeAI();
  
  
  loadPersonalizedRecommendations();

  
  document.getElementById('discover-search-input').focus();
  
  
  document.getElementById('discover-search-input').addEventListener('input', handleDiscoverSearchKeypress);
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDiscoverPage);
} else {
  initDiscoverPage();
}


window.toggleTheme = toggleTheme;
window.logout = logout;
window.performDiscoverSearch = performDiscoverSearch;
window.handleDiscoverSearchKeypress = handleDiscoverSearchKeypress;
window.quickSearch = quickSearch;
window.clearSearch = clearSearch;
window.showSearchHistory = showSearchHistory;
window.closeSearchHistory = closeSearchHistory;
window.showSavedSearches = showSavedSearches;
window.loadSavedSearch = loadSavedSearch;
window.deleteSavedSearch = deleteSavedSearch;
window.toggleFilters = toggleFilters;
window.selectLength = selectLength;
window.resetFilters = resetFilters;
window.applyFilters = applyFilters;
window.saveCurrentSearch = saveCurrentSearch;
window.showGenreExcludeModal = showGenreExcludeModal;
window.showAuthorExcludeModal = showAuthorExcludeModal;
window.removeExcludedGenre = removeExcludedGenre;
window.removeExcludedAuthor = removeExcludedAuthor;
window.cancelSearch = cancelSearch;
window.loadMoreResults = loadMoreResults;
window.switchView = switchView;
window.showAddBookModal = showAddBookModal;
window.selectAddStatus = selectAddStatus;
window.addBookToLibrary = addBookToLibrary;
window.addBookFromDetailsModal = addBookFromDetailsModal;
window.showBookDetails = showBookDetails;