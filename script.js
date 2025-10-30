let user = {
  name: "User",
  yearlyGoal: 50,
  readingStreak: 0,
  totalReadingTime: 0
};


let currentlyReadingList,
  recentlyFinishedList,
  suggestedBooksList,
  completeLibraryList,
  welcomeText,
  goalProgress,
  readingStreakEl,
  booksReadStat,
  pagesReadStat,
  goalStat,
  avgRatingStat,
  favGenreStat,
  totalTimeStat,
  progressBar;


let bookInputs = [];
let stats = {};
let booksRead = 0;
let pagesRead = 0;
let totalRating = 0;
let genreCount = {};
let userAchievements = new Set();
let previousAchievements = new Set();


const ACHIEVEMENTS = [
  
  { code: 'first_book', title: 'First Chapter Complete', description: 'Finished your first book', icon: '📖', tier: 'bronze', check: (data) => data.booksRead >= 1 },
  { code: 'five_books', title: 'Bookworm', description: 'Read 5 books', icon: '📚', tier: 'bronze', check: (data) => data.booksRead >= 5 },
  { code: 'ten_books', title: 'Avid Reader', description: 'Read 10 books', icon: '📕', tier: 'silver', check: (data) => data.booksRead >= 10 },
  { code: 'twentyfive_books', title: 'Bibliophile', description: 'Read 25 books', icon: '📗', tier: 'silver', check: (data) => data.booksRead >= 25 },
  { code: 'fifty_books', title: 'Master Reader', description: 'Read 50 books', icon: '📘', tier: 'gold', check: (data) => data.booksRead >= 50 },
  { code: 'hundred_books', title: 'Century Club', description: 'Read 100 books', icon: '📙', tier: 'platinum', check: (data) => data.booksRead >= 100 },
  
  
  { code: 'thousand_pages', title: 'Page Turner', description: 'Read 1,000 pages', icon: '📄', tier: 'bronze', check: (data) => data.pagesRead >= 1000 },
  { code: 'five_thousand_pages', title: 'Epic Reader', description: 'Read 5,000 pages', icon: '📃', tier: 'silver', check: (data) => data.pagesRead >= 5000 },
  { code: 'ten_thousand_pages', title: 'Marathon Reader', description: 'Read 10,000 pages', icon: '📜', tier: 'gold', check: (data) => data.pagesRead >= 10000 },
  
  
  { code: 'fifty_hours', title: 'Dedicated Reader', description: 'Spent 50 hours reading', icon: '⏰', tier: 'bronze', check: (data) => data.totalReadingTime >= 50 },
  { code: 'hundred_hours', title: 'Time Traveler', description: 'Spent 100 hours reading', icon: '⌛', tier: 'silver', check: (data) => data.totalReadingTime >= 100 },
  { code: 'two_hundred_hours', title: 'Chronos', description: 'Spent 200 hours reading', icon: '⏳', tier: 'gold', check: (data) => data.totalReadingTime >= 200 },
  
  
  { code: 'three_day_streak', title: 'Getting Started', description: 'Read for 3 days in a row', icon: '🔥', tier: 'bronze', check: (data) => data.readingStreak >= 3 },
  { code: 'week_streak', title: 'Week Warrior', description: 'Read for 7 days in a row', icon: '🌟', tier: 'silver', check: (data) => data.readingStreak >= 7 },
  { code: 'month_streak', title: 'Unstoppable', description: 'Read for 30 days in a row', icon: '⚡', tier: 'gold', check: (data) => data.readingStreak >= 30 },
  
  
  { code: 'genre_explorer', title: 'Genre Explorer', description: 'Read books from 5 different genres', icon: '🗺️', tier: 'bronze', check: (data) => data.genreCount >= 5 },
  { code: 'eclectic_reader', title: 'Eclectic Reader', description: 'Read books from 10 different genres', icon: '🎭', tier: 'silver', check: (data) => data.genreCount >= 10 },
  
  
  { code: 'critic', title: 'The Critic', description: 'Rated 25 books', icon: '⭐', tier: 'bronze', check: (data) => data.ratedBooks >= 25 },
  { code: 'thoughtful_reader', title: 'Thoughtful Reader', description: 'Added notes to 10 books', icon: '💭', tier: 'bronze', check: (data) => data.booksWithNotes >= 10 },
  { code: 'five_star_fanatic', title: 'Five Star Fanatic', description: 'Gave 10 five-star ratings', icon: '🌟', tier: 'silver', check: (data) => data.fiveStarBooks >= 10 },
  
  
  { code: 'goal_getter', title: 'Goal Getter', description: 'Reached your yearly reading goal', icon: '🎯', tier: 'gold', check: (data) => data.goalPercent >= 100 },
  { code: 'overachiever', title: 'Overachiever', description: 'Exceeded yearly goal by 25%', icon: '🚀', tier: 'platinum', check: (data) => data.goalPercent >= 125 },
  
  
  { code: 'speed_reader', title: 'Speed Reader', description: 'Finished a 300+ page book in under 5 hours', icon: '💨', tier: 'silver', check: (data) => data.speedRead },
  { code: 'night_owl', title: 'Night Owl', description: 'Spent over 20 hours reading this month', icon: '🦉', tier: 'bronze', check: (data) => data.monthlyReadingTime >= 20 }
];


function calculateAchievementData() {
  const finishedBooks = bookInputs.filter(b => b.status === 'Finished');
  const booksWithNotes = bookInputs.filter(b => b.notes && b.notes.trim().length > 0).length;
  const ratedBooks = bookInputs.filter(b => b.rating && b.rating > 0).length;
  const fiveStarBooks = bookInputs.filter(b => b.rating === 5).length;
  const uniqueGenres = new Set(finishedBooks.map(b => b.genre).filter(g => g && g !== 'Unknown'));
  
  const speedRead = finishedBooks.some(b => {
    const pages = b.pages || 0;
    const time = b.readingTime || 0;
    return pages >= 300 && time > 0 && time < 5;
  });
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthlyReadingTime = bookInputs
    .filter(b => b.lastReadDate && new Date(b.lastReadDate) >= thirtyDaysAgo)
    .reduce((sum, b) => sum + (b.readingTime || 0), 0);
  
  const goalPercent = user.yearlyGoal ? Math.round((booksRead / user.yearlyGoal) * 100) : 0;
  
  return {
    booksRead,
    pagesRead,
    totalReadingTime: user.totalReadingTime || 0,
    readingStreak: user.readingStreak || 0,
    genreCount: uniqueGenres.size,
    ratedBooks,
    booksWithNotes,
    fiveStarBooks,
    goalPercent,
    speedRead,
    monthlyReadingTime
  };
}


async function checkAchievements() {
  const data = calculateAchievementData();
  const newlyUnlocked = [];

  previousAchievements = new Set(userAchievements);

  ACHIEVEMENTS.forEach(achievement => {
    if (achievement.check(data)) {
      if (!userAchievements.has(achievement.code)) {
        newlyUnlocked.push(achievement);
      }
      userAchievements.add(achievement.code);
    }
  });

  
  try {
    await api.saveAchievements([...userAchievements]);
    console.log('✅ Achievements saved to database');
  } catch (error) {
    console.error('Failed to save achievements to database:', error);
    
    localStorage.setItem('booktracker_achievements', JSON.stringify([...userAchievements]));
  }

  if (newlyUnlocked.length > 0) {
    newlyUnlocked.forEach((achievement, index) => {
      setTimeout(() => {
        showAchievementUnlock(achievement);
      }, index * 500);
    });
  }

  return newlyUnlocked;
}


async function loadAchievements() {
  try {
    const response = await api.getAchievements();
    const achievementCodes = response.achievements || response; 
    const currentYear = response.year || new Date().getFullYear();

    userAchievements = new Set(achievementCodes);
    previousAchievements = new Set(achievementCodes);
    console.log(`✅ Loaded ${achievementCodes.length} achievements for ${currentYear} from database`);
  } catch (error) {
    console.error('Failed to load achievements from database:', error);
    
    const saved = localStorage.getItem('booktracker_achievements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        userAchievements = new Set(parsed);
        previousAchievements = new Set(parsed);
        console.log('⚠️ Loaded achievements from localStorage (fallback)');
      } catch (e) {
        console.error('Failed to load achievements from localStorage:', e);
      }
    }
  }
}


function showAchievementUnlock(achievement) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    color: white;
    padding: 20px 24px;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(99, 102, 241, 0.6);
    z-index: 10001;
    min-width: 300px;
    animation: achievementSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  notification.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 48px; margin-bottom: 8px;">${achievement.icon}</div>
      <div style="font-weight: 800; font-size: 18px; margin-bottom: 4px;">Achievement Unlocked!</div>
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${achievement.title}</div>
      <div style="font-size: 13px; opacity: 0.9;">${achievement.description}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  createConfetti(notification);
  
  setTimeout(() => {
    notification.style.animation = 'achievementSlideOut 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => notification.remove(), 400);
  }, 4000);
}


function createConfetti(container) {
  const colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];
  for (let i = 0; i < 20; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      top: 50%;
      left: 50%;
      border-radius: 50%;
      animation: confettiFall ${0.5 + Math.random() * 1}s ease-out forwards;
      animation-delay: ${Math.random() * 0.3}s;
      transform: translate(-50%, -50%) rotate(${Math.random() * 360}deg);
    `;
    container.appendChild(confetti);
    setTimeout(() => confetti.remove(), 2000);
  }
}


function renderAchievements() {
  const achievementsList = document.getElementById('achievements-list');
  if (!achievementsList) return;
  
  const unlockedAchievements = ACHIEVEMENTS.filter(a => userAchievements.has(a.code));
  
  if (unlockedAchievements.length === 0) {
    achievementsList.innerHTML = `
      <div class="achievements-empty">
        <div class="empty-icon">Ã°Å¸Â�â€ </div>
        <h3>No Achievements Yet</h3>
        <p>Keep reading to unlock your first achievement!</p>
      </div>
    `;
    return;
  }
  
  const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
  unlockedAchievements.sort((a, b) => tierOrder[b.tier] - tierOrder[a.tier]);
  
  achievementsList.innerHTML = '';
  
  unlockedAchievements.forEach(achievement => {
    const isNew = !previousAchievements.has(achievement.code);
    const card = document.createElement('div');
    card.className = `badge-card ${isNew ? 'new-achievement' : ''}`;
    
    card.innerHTML = `
      ${isNew ? '<div class="new-badge">NEW!</div>' : ''}
      <div class="badge-tier ${achievement.tier}">${achievement.tier}</div>
      <div class="badge-icon">${achievement.icon}</div>
      <div class="badge-title">${achievement.title}</div>
      <div class="badge-description">${achievement.description}</div>
    `;
    
    achievementsList.appendChild(card);
  });
}


function checkAuth() {
  if (!api.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}


function logout() {
  if (confirm('Are you sure you want to logout?')) {
    api.logout();
    window.location.href = 'login.html';
  }
}


function cacheElements() {
  currentlyReadingList = document.getElementById("currently-reading-list");
  recentlyFinishedList = document.getElementById("recently-finished-list");
  suggestedBooksList = document.getElementById("suggested-books-list");
  completeLibraryList = document.getElementById("complete-library-list");
  welcomeText = document.getElementById("welcome-text");
  goalProgress = document.getElementById("goal-progress");
  readingStreakEl = document.getElementById("reading-streak");
  booksReadStat = document.getElementById("books-read");
  pagesReadStat = document.getElementById("pages-read");
  goalStat = document.getElementById("goal");
  avgRatingStat = document.getElementById("avg-rating");
  favGenreStat = document.getElementById("fav-genre");
  totalTimeStat = document.getElementById("total-time");
  progressBar = document.querySelector(".progress-bar");
}


function initThemeToggle() {
  const savedTheme = localStorage.getItem('bookTrackerTheme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  localStorage.setItem('bookTrackerTheme', currentTheme);
  updateThemeIcon();

  // Re-render charts with updated theme colors
  if (typeof renderCharts === 'function') {
    renderCharts();
  }
}

function updateThemeIcon() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
  }
}


async function loadUserData() {
  try {
    const userData = await api.getCurrentUser();
    user = {
      name: userData.username,
      yearlyGoal: userData.yearly_goal,
      readingStreak: 0,
      totalReadingTime: 0
    };
    
    if (welcomeText) {
      welcomeText.textContent = `Welcome back, ${user.name}!`;
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
    if (error.message.includes('token')) {
      api.logout();
      window.location.href = 'login.html';
    }
  }
}


async function loadBooksFromAPI() {
  try {
    const books = await api.getBooks();
    bookInputs = books.map(b => ({
      id: b.id,
      title: b.title,
      author: b.author,
      status: b.status,
      rating: b.rating,
      progress: b.progress || 0,
      pages: b.pages || 0,
      genre: b.genre || "Unknown",
      lastReadDate: b.last_read_date,
      readingTime: parseFloat(b.reading_time) || 0,
      description: b.description || "",
      notes: b.notes || "",
      publisher: b.publisher || "",
      publishedDate: b.published_date || "",
      isbn: b.isbn,
      coverUrl: b.cover_url
    }));

    
    window.bookInputs = bookInputs;

    console.log(`📚 Loaded ${bookInputs.length} books from API`);
    await renderBooks();
  } catch (error) {
    console.error('Error loading books:', error);
    showNotification('Failed to load books', 'error');
  }
}


async function loadStatistics() {
  try {
    stats = await api.getStatistics();
    user.readingStreak = stats.readingStreak;
    user.totalReadingTime = stats.totalReadingTime;
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}


let lastAPICall = 0;
const API_DELAY = 150;

async function fetchBookInfo(book) {
  if (book.coverUrl) {
    return {
      title: book.title,
      author: book.author,
      cover: book.coverUrl,
      pages: book.pages,
      description: book.description || '',
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      isbn: book.isbn
    };
  }

  const now = Date.now();
  const timeSinceLastCall = now - lastAPICall;
  if (timeSinceLastCall < API_DELAY) {
    await new Promise(resolve => setTimeout(resolve, API_DELAY - timeSinceLastCall));
  }
  lastAPICall = Date.now();

  try {
    let searchResults;
    if (book.isbn) {
      searchResults = await api.searchBooksByISBN(book.isbn);
    } else {
      searchResults = await api.searchBooks(`${book.title} ${book.author}`);
    }

    if (searchResults && searchResults.length > 0) {
      const bookInfo = searchResults[0];
      
      if (book.id) {
        const updates = {};
        if (bookInfo.coverUrl) {
          updates.coverUrl = bookInfo.coverUrl;
        }
        if (bookInfo.description && !book.description) {
          updates.description = bookInfo.description;
        }
        
        if (Object.keys(updates).length > 0) {
          await api.updateBook(book.id, updates);
        }
      }

      return {
        title: bookInfo.title || book.title,
        author: bookInfo.author || book.author,
        cover: bookInfo.coverUrl || `https://via.placeholder.com/160x220/667eea/ffffff?text=${encodeURIComponent(book.title.substring(0, 20))}`,
        pages: bookInfo.pages || book.pages,
        description: bookInfo.description || book.description || '',
        publisher: bookInfo.publisher || book.publisher,
        publishedDate: bookInfo.publishedDate || book.publishedDate,
        isbn: bookInfo.isbn || book.isbn
      };
    }
  } catch (error) {
    console.warn('Failed to fetch book info:', error);
  }

  return {
    title: book.title,
    author: book.author,
    cover: `https://via.placeholder.com/160x220/667eea/ffffff?text=${encodeURIComponent(book.title.substring(0, 20))}`,
    pages: book.pages,
    description: book.description || 'No description available',
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    isbn: book.isbn
  };
}


async function updateReadingTime(bookId, newTime) {
  try {
    await api.updateBook(bookId, { readingTime: parseFloat(newTime) });
    showNotification('Reading time updated!', 'success');
    await loadBooksFromAPI();
  } catch (error) {
    console.error('Failed to update reading time:', error);
    showNotification('Failed to update reading time', 'error');
  }
}


function calculateReadingStreak(books) {
  const finishedBooks = books.filter(b => b.rating !== null && b.lastReadDate);
  if (finishedBooks.length === 0) return 0;
  
  const dates = finishedBooks
    .map(b => new Date(b.lastReadDate).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);
  
  let streak = 0;
  let currentDate = new Date().setHours(0, 0, 0, 0);
  
  for (const date of dates) {
    const dayDiff = Math.floor((currentDate - date) / 86400000);
    if (dayDiff === 0) {
      streak++;
      currentDate -= 86400000;
    } else if (dayDiff === 1) {
      streak++;
      currentDate = date - 86400000;
    } else {
      break;
    }
  }
  
  return streak;
}


async function fetchRecommendationsByGenre(genre, libraryTitles) {
  if (!genre || genre === "N/A" || genre === "Unknown") {
    return [];
  }
  
  try {
    const searchResults = await api.searchBooksByGenre(genre);
    const filtered = searchResults
      .filter(book => !libraryTitles.has(book.title.toLowerCase()))
      .slice(0, 12);
    return filtered;
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return [];
  }
}


function updateTotalReadingTime() {
  let total = bookInputs.reduce((sum, book) => sum + (book.readingTime || 0), 0);
  const hours = Math.floor(total);
  const minutes = Math.round((total - hours) * 60);
  if (totalTimeStat) totalTimeStat.textContent = `Total Time: ${hours}h ${minutes}m`;
}







const RECENTLY_FINISHED_CONFIG = {
  maxBooks: 10,           
  daysThreshold: 60,     
  sortBy: 'newest'       
};


async function renderBooks() {
  booksRead = 0;
  pagesRead = 0;
  totalRating = 0;
  genreCount = {};
  
  if (currentlyReadingList) currentlyReadingList.innerHTML = "";
  if (recentlyFinishedList) recentlyFinishedList.innerHTML = "";
  if (completeLibraryList) completeLibraryList.innerHTML = "";
  if (suggestedBooksList) suggestedBooksList.innerHTML = "";

  await loadStatistics();

  const bookInfoList = await Promise.all(bookInputs.map(b => fetchBookInfo(b).catch(err => {
    console.warn("fetchBookInfo failed for", b.title, err);
    return {
      title: b.title,
      author: b.author || "Unknown",
      cover: `https://via.placeholder.com/160x220/667eea/ffffff?text=${encodeURIComponent(b.title.substring(0, 20))}`,
      pages: b.pages || 0,
      description: b.description || "",
      publisher: b.publisher || "",
      publishedDate: b.publishedDate || "",
      isbn: b.isbn || null
    };
  })));

  for (let i = 0; i < bookInputs.length; i++) {
    const b = bookInputs[i];
    const bookInfo = bookInfoList[i] || {};
    pagesRead += bookInfo.pages || 0;
    
    if (b.rating != null && b.rating !== '' && !isNaN(b.rating)) {
      booksRead++;
      totalRating += parseFloat(b.rating);
      genreCount[b.genre] = (genreCount[b.genre] || 0) + 1;
    }
  }

  const goalPercent = user.yearlyGoal ? Math.round((booksRead / user.yearlyGoal) * 100) : 0;
  const avgRating = (booksRead > 0 && totalRating > 0) ? (totalRating / booksRead).toFixed(1) : '0.0';
  const favoriteGenre = Object.keys(genreCount).length
    ? Object.keys(genreCount).reduce((a, b) => (genreCount[a] > genreCount[b] ? a : b))
    : "N/A";

  if (goalProgress) goalProgress.textContent = `You've completed ${goalPercent}% of your ${user.yearlyGoal}-book goal!`;
  if (booksReadStat) booksReadStat.textContent = `${booksRead} Books Read`;
  if (pagesReadStat) pagesReadStat.textContent = `${pagesRead} Pages Read`;
  if (goalStat) goalStat.textContent = `Goal: ${goalPercent}%`;
  if (avgRatingStat) avgRatingStat.textContent = `Avg Rating: ${avgRating} ⭐`;
  if (favGenreStat) favGenreStat.textContent = `Favorite Genre: ${favoriteGenre}`;

  const streak = stats.readingStreak || calculateReadingStreak(bookInputs);
  if (readingStreakEl) readingStreakEl.textContent = `Reading Streak: ${streak} day(s)`;

  if (progressBar) {
    progressBar.style.width = "0";
    progressBar.style.setProperty("--progress-width", `${goalPercent}%`);
    progressBar.classList.remove("animate", "loaded");
    void progressBar.offsetWidth;
    progressBar.classList.add("animate");
    
    setTimeout(() => {
      progressBar.style.width = `${goalPercent}%`;
      progressBar.classList.add("loaded");
    }, 2000);
  }

  
  
  
  const finishedBooks = bookInputs.filter(b => b.status === "Finished");
  const recentlyFinished = getRecentlyFinishedBooks(finishedBooks);
  
  console.log(`ðŸ“š Total finished books: ${finishedBooks.length}`);
  console.log(`⏰ Recently finished (last ${RECENTLY_FINISHED_CONFIG.daysThreshold} days): ${recentlyFinished.length}`);
  console.log(`ðŸ‘€ Displaying: ${Math.min(recentlyFinished.length, RECENTLY_FINISHED_CONFIG.maxBooks)} books`);

  
  for (let i = 0; i < bookInputs.length; i++) {
    const b = bookInputs[i];
    const bookInfo = bookInfoList[i];
    const card = createBookCard(b, bookInfo);

    
    if (b.status === "Currently Reading" && currentlyReadingList) {
      currentlyReadingList.appendChild(card);
    }

    
    if (b.status === "Finished" && recentlyFinishedList) {
      
      const isRecent = recentlyFinished.some(rb => rb.id === b.id);
      if (isRecent) {
        recentlyFinishedList.appendChild(card);
      }
    }

    
    if (completeLibraryList) {
      completeLibraryList.appendChild(card.cloneNode(true));
      
      const clonedCard = completeLibraryList.lastChild;
      clonedCard.addEventListener("click", (e) => {
        if (!e.target.closest(".editable-time") && 
            !e.target.closest(".btn-edit-book") && 
            !e.target.closest(".btn-delete-book")) {
          clonedCard.classList.toggle("flipped");
        }
      });
      
      const editBtn = clonedCard.querySelector(".btn-edit-book");
      const deleteBtn = clonedCard.querySelector(".btn-delete-book");
      
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openEditModal(b.id);
        });
      }
      
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openDeleteModal(b.id, b.title);
        });
      }
      
      if (b.status === "Currently Reading") {
        const readingTimeEl = clonedCard.querySelector(".editable-time");
        if (readingTimeEl) {
          readingTimeEl.addEventListener("click", async (e) => {
            e.stopPropagation();
            const newTime = prompt("Enter new reading time (hours):", b.readingTime || 0);
            if (newTime !== null) {
              await updateReadingTime(b.id, newTime);
            }
          });
        }
      }
    }
  }

  
  
  
  if (recentlyFinishedList && recentlyFinished.length === 0 && finishedBooks.length > 0) {
    recentlyFinishedList.innerHTML = `
      <div class="empty-state-inline">
        <div class="empty-icon">ðŸ“…</div>
        <h3>No Recent Finishes</h3>
        <p>You haven't finished any books in the last ${RECENTLY_FINISHED_CONFIG.daysThreshold} days.</p>
        <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
          You have ${finishedBooks.length} finished book${finishedBooks.length !== 1 ? 's' : ''} in your library.
        </p>
      </div>
    `;
  } else if (recentlyFinishedList && recentlyFinished.length === 0) {
    recentlyFinishedList.innerHTML = `
      <div class="empty-state-inline">
        <div class="empty-icon">ðŸ“–</div>
        <h3>No Finished Books Yet</h3>
        <p>Start reading and mark books as finished to see them here!</p>
      </div>
    `;
  }

  if (suggestedBooksList) {
    const libraryTitles = new Set(bookInputs.map(b => b.title.toLowerCase()));
    const recommendations = await fetchRecommendationsByGenre(favoriteGenre, libraryTitles);
    
    if (recommendations.length > 0) {
      for (const rec of recommendations) {
        const recCard = document.createElement("div");
        recCard.className = "book-card";
        recCard.innerHTML = `
          <div class="book-inner">
            <div class="book-front">
              <img src="${rec.coverUrl || rec.cover || 'https://via.placeholder.com/160x220?text=No+Cover'}" alt="${rec.title}">
              <h3 title="${rec.title}">${rec.title}</h3>
              <p title="${rec.author}">${rec.author}</p>
              <div class="book-info"><span>Genre: ${rec.genre || favoriteGenre}</span></div>
            </div>
          </div>
        `;
        suggestedBooksList.appendChild(recCard);
      }
    } else {
      suggestedBooksList.innerHTML = "<p>No recommendations found.</p>";
    }
  }

  renderCharts();
  updateTotalReadingTime();
  
  
  checkAchievements();
  renderAchievements();
}




function getRecentlyFinishedBooks(finishedBooks) {
  if (!finishedBooks || finishedBooks.length === 0) {
    return [];
  }

  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(now.getDate() - RECENTLY_FINISHED_CONFIG.daysThreshold);

  
  let recentBooks = finishedBooks.filter(book => {
    if (!book.lastReadDate) return false;
    
    const finishDate = new Date(book.lastReadDate);
    return finishDate >= thresholdDate;
  });

  
  switch (RECENTLY_FINISHED_CONFIG.sortBy) {
    case 'newest':
      recentBooks.sort((a, b) => {
        const dateA = new Date(a.lastReadDate || 0);
        const dateB = new Date(b.lastReadDate || 0);
        return dateB - dateA; 
      });
      break;
    
    case 'highest_rated':
      recentBooks.sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        
        const dateA = new Date(a.lastReadDate || 0);
        const dateB = new Date(b.lastReadDate || 0);
        return dateB - dateA;
      });
      break;
    
    case 'random':
      
      for (let i = recentBooks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [recentBooks[i], recentBooks[j]] = [recentBooks[j], recentBooks[i]];
      }
      break;
  }

  
  return recentBooks.slice(0, RECENTLY_FINISHED_CONFIG.maxBooks);
}




function getTimeAgoText(dateString) {
  if (!dateString) return '';
  
  const finishDate = new Date(dateString);
  const now = new Date();
  const daysAgo = Math.floor((now - finishDate) / (1000 * 60 * 60 * 24));
  
  if (daysAgo === 0) return 'Finished today';
  if (daysAgo === 1) return 'Finished yesterday';
  if (daysAgo < 7) return `Finished ${daysAgo} days ago`;
  if (daysAgo < 30) return `Finished ${Math.floor(daysAgo / 7)} weeks ago`;
  if (daysAgo < 90) return `Finished ${Math.floor(daysAgo / 30)} months ago`;
  return `Finished ${Math.floor(daysAgo / 365)} years ago`;
}

console.log('✅ Recently Finished filter loaded');
console.log(`ðŸ“Š Configuration: Show ${RECENTLY_FINISHED_CONFIG.maxBooks} books from last ${RECENTLY_FINISHED_CONFIG.daysThreshold} days`);
console.log(`ðŸ”„ Sort by: ${RECENTLY_FINISHED_CONFIG.sortBy}`);


function createBookCard(book, bookInfo) {
  const card = document.createElement("div");
  card.className = "book-card";

  let infoPanel = '';
  if (book.status === "Currently Reading") {
    infoPanel = `
      <div class="book-info">
        <div class="reading-progress"><div class="fill" style="width:${book.progress}%"></div></div>
        <span>${book.progress}% Complete</span>
        <span class="editable-time" data-book-id="${book.id}">Reading Time: ${book.readingTime || 0} hrs</span>
      </div>
    `;
  }

  let starRatingHTML = '';
  if (book.status === "Finished" && book.rating) {
    const fullStars = Math.floor(book.rating);
    const hasHalfStar = (book.rating % 1) >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
   const stars = '★'.repeat(fullStars) + (hasHalfStar ?  '☆' : '') + '☆'.repeat(emptyStars);
    starRatingHTML = `<div class="star-rating">${stars}</div>`;
  }

  card.innerHTML = `
    <div class="book-inner">
      <div class="book-front">
        <img src="${bookInfo.cover}" alt="${bookInfo.title}">
        <h3 title="${bookInfo.title}">${bookInfo.title}</h3>
        <p title="${bookInfo.author}">${bookInfo.author}</p>
        ${starRatingHTML}
        ${infoPanel}
      </div>
      <div class="book-back">
        <div class="description-section">
          <div class="section-title">📖 Description</div>
          <div class="description-content">
            ${bookInfo.description || 'No description available'}
          </div>
        </div>
        
        ${book.notes ? `
          <div class="notes-section">
            <div class="section-title">💭 Personal Notes</div>
            <div class="notes-content">
              ${book.notes}
            </div>
          </div>
        ` : ''}
        
        <div class="metadata-section">
          ${bookInfo.publisher ? `
            <div class="metadata-item">
              <span class="metadata-label">Publisher:</span>
              <span class="metadata-value">${bookInfo.publisher}</span>
            </div>
          ` : ''}
          <div class="metadata-item">
            <span class="metadata-label">Pages:</span>
            <span class="metadata-value">${bookInfo.pages || 0}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Genre:</span>
            <span class="metadata-value">${book.genre}</span>
          </div>
        </div>
        
        <a href="https://www.google.com/search?q=${encodeURIComponent(bookInfo.title + ' ' + bookInfo.author)}" target="_blank">🔍 Search Online</a>
        
        <div class="book-back-actions">
          <button class="btn-edit-book" data-book-id="${book.id}">
            <span>✏️</span> Edit Details
          </button>
          <button class="btn-delete-book" data-book-id="${book.id}">
            <span>🗑️</span> Remove
          </button>
        </div>
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (!e.target.closest(".editable-time") && 
        !e.target.closest(".btn-edit-book") && 
        !e.target.closest(".btn-delete-book")) {
      card.classList.toggle("flipped");
    }
  });

  const editBtn = card.querySelector(".btn-edit-book");
  if (editBtn) {
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditModal(book.id);
    });
  }

  const deleteBtn = card.querySelector(".btn-delete-book");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openDeleteModal(book.id, book.title);
    });
  }

  if (book.status === "Currently Reading") {
    const readingTimeEl = card.querySelector(".editable-time");
    if (readingTimeEl) {
      readingTimeEl.style.cursor = "pointer";
      readingTimeEl.style.textDecoration = "underline";
      readingTimeEl.addEventListener("click", async (e) => {
        e.stopPropagation();
        const newTime = prompt("Enter new reading time (hours):", book.readingTime || 0);
        if (newTime !== null) {
          await updateReadingTime(book.id, newTime);
        }
      });
    }
  }

  return card;
}


function renderCharts() {
  if (typeof Chart === 'undefined') return;

  // Get computed text color for better theme compatibility
  const isDarkMode = !document.body.classList.contains('light-mode');
  const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';
  const gridColor = isDarkMode ? 'rgba(226, 232, 240, 0.1)' : 'rgba(30, 41, 59, 0.1)';

  // Configure default Chart.js options
  Chart.defaults.font.family = "'Inter', 'Segoe UI', 'Roboto', sans-serif";
  Chart.defaults.font.size = 14;
  Chart.defaults.color = textColor;

  const ctx1 = document.getElementById("monthly-progress-chart");
  if (ctx1) {
    const monthlyData = calculateMonthlyProgress();
    if (window.monthlyChart) window.monthlyChart.destroy();
    window.monthlyChart = new Chart(ctx1, {
      type: "bar",
      data: {
        labels: monthlyData.labels,
        datasets: [{
          label: "Books Read",
          data: monthlyData.data,
          backgroundColor: "rgba(102, 126, 234, 0.8)",
          borderColor: "#667eea",
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: "#667eea"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: textColor,
              font: {
                size: 14,
                weight: '600'
              },
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: '#667eea',
            borderWidth: 2,
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 15,
              weight: 'bold'
            },
            bodyFont: {
              size: 14
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              font: {
                size: 13,
                weight: '500'
              }
            },
            grid: {
              color: gridColor,
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              font: {
                size: 13,
                weight: '500'
              },
              stepSize: 1
            },
            grid: {
              color: gridColor
            }
          }
        }
      }
    });
  }

  const ctx2 = document.getElementById("genre-distribution-chart");
  if (ctx2) {
    if (window.genreChart) window.genreChart.destroy();
    window.genreChart = new Chart(ctx2, {
      type: "pie",
      data: {
        labels: Object.keys(genreCount),
        datasets: [{
          data: Object.values(genreCount),
          backgroundColor: [
            "rgba(102, 126, 234, 0.9)",
            "rgba(168, 85, 247, 0.9)",
            "rgba(245, 158, 11, 0.9)",
            "rgba(239, 68, 68, 0.9)",
            "rgba(34, 197, 94, 0.9)",
            "rgba(236, 72, 153, 0.9)",
            "rgba(59, 130, 246, 0.9)",
            "rgba(249, 115, 22, 0.9)"
          ],
          borderColor: isDarkMode ? '#0f172a' : '#ffffff',
          borderWidth: 3,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: textColor,
              font: {
                size: 13,
                weight: '600'
              },
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: '#667eea',
            borderWidth: 2,
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 15,
              weight: 'bold'
            },
            bodyFont: {
              size: 14
            },
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} books (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  const ctx3 = document.getElementById("pages-over-time-chart");
  if (ctx3) {
    const pagesData = calculatePagesOverTime();
    if (window.pagesChart) window.pagesChart.destroy();
    window.pagesChart = new Chart(ctx3, {
      type: "line",
      data: {
        labels: pagesData.labels,
        datasets: [{
          label: "Pages Read",
          data: pagesData.data,
          borderColor: "#667eea",
          backgroundColor: isDarkMode ?
            "rgba(102, 126, 234, 0.15)" :
            "rgba(102, 126, 234, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: "#667eea",
          pointBorderColor: isDarkMode ? '#0f172a' : '#ffffff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: "#a855f7",
          pointHoverBorderColor: "#667eea"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: textColor,
              font: {
                size: 14,
                weight: '600'
              },
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: '#667eea',
            borderWidth: 2,
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 15,
              weight: 'bold'
            },
            bodyFont: {
              size: 14
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              font: {
                size: 13,
                weight: '500'
              }
            },
            grid: {
              color: gridColor,
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              font: {
                size: 13,
                weight: '500'
              }
            },
            grid: {
              color: gridColor
            }
          }
        }
      }
    });
  }
}

function calculateMonthlyProgress() {
  const finishedBooks = bookInputs.filter(b => b.rating !== null && b.lastReadDate);
  const monthCounts = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  finishedBooks.forEach(book => {
    const date = new Date(book.lastReadDate);
    const monthKey = `${months[date.getMonth()]}`;
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  });
  
  const now = new Date();
  const labels = [];
  const data = [];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = months[d.getMonth()];
    labels.push(monthLabel);
    data.push(monthCounts[monthLabel] || 0);
  }
  
  return { labels, data };
}

function calculatePagesOverTime() {
  const finishedBooks = bookInputs
    .filter(b => b.rating !== null && b.lastReadDate)
    .sort((a, b) => new Date(a.lastReadDate) - new Date(b.lastReadDate));
  
  if (finishedBooks.length === 0) {
    return { labels: ["Week 1", "Week 2", "Week 3", "Week 4"], data: [0, 0, 0, 0] };
  }
  
  const now = new Date();
  const labels = [];
  const data = [];
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    
    labels.push(`Week ${4 - i}`);
    
    const pagesInWeek = finishedBooks
      .filter(b => {
        const bookDate = new Date(b.lastReadDate);
        return bookDate >= weekStart && bookDate < weekEnd;
      })
      .reduce((sum, b) => sum + (b.pages || 0), 0);
    
    data.push(pagesInWeek);
  }
  
  return { labels, data };
}


function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)'};
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    font-weight: 500;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}


const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);


async function initApp() {
  if (!checkAuth()) return;

  cacheElements();
  initThemeToggle();
  updateThemeIcon();

  
  initializeModals();

  
  await loadAchievements();

  await loadUserData();
  await loadBooksFromAPI();
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}


window.toggleTheme = toggleTheme;
window.logout = logout;