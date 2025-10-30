let currentFilters = {
  status: 'all',
  genre: 'all',
  author: 'all',
  year: 'all',
  sort: 'recent'
};

let allBooks = [];
let filteredBooks = [];
let filtersInitialized = false;


function initializeLibraryFilters() {
  if (filtersInitialized) {
    console.log('⚠️ Filters already initialized');
    return;
  }

  console.log('📚 Initializing library filters...');

  
  if (!window.bookInputs) {
    console.warn('⚠️ bookInputs not found. Waiting...');
    setTimeout(initializeLibraryFilters, 500);
    return;
  }

  if (window.bookInputs.length === 0) {
    console.log('ℹ️ No books in library yet');
    filtersInitialized = true;
    return;
  }

  
  allBooks = [...window.bookInputs];
  console.log(`✅ Loaded ${allBooks.length} books for filtering`);

  
  populateFilterDropdowns();

  
  attachFilterEventListeners();

  
  applyFilters();

  filtersInitialized = true;
  console.log('✅ Library filters initialized successfully');
}


function populateFilterDropdowns() {
  console.log('📝 Populating filter dropdowns from', allBooks.length, 'books');
  console.log('Sample book:', allBooks[0]);

  
  const genres = new Set();
  allBooks.forEach(book => {
    if (book.genre && book.genre !== 'Unknown' && book.genre !== '') {
      genres.add(book.genre);
    }
  });

  const genreSelect = document.getElementById('filter-genre');
  if (genreSelect) {
    
    while (genreSelect.options.length > 1) {
      genreSelect.remove(1);
    }

    const sortedGenres = Array.from(genres).sort();
    console.log('Found genres:', sortedGenres);
    sortedGenres.forEach(genre => {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      genreSelect.appendChild(option);
    });
  }

  
  const authors = new Set();
  allBooks.forEach(book => {
    if (book.author && book.author !== 'Unknown' && book.author !== '') {
      authors.add(book.author);
    }
  });

  const authorSelect = document.getElementById('filter-author');
  if (authorSelect) {
    
    while (authorSelect.options.length > 1) {
      authorSelect.remove(1);
    }

    const sortedAuthors = Array.from(authors).sort();
    console.log('Found authors:', sortedAuthors);
    sortedAuthors.forEach(author => {
      const option = document.createElement('option');
      option.value = author;
      option.textContent = author;
      authorSelect.appendChild(option);
    });
  }

  
  const years = new Set();
  allBooks.forEach(book => {
    if (book.status === 'Finished' && book.lastReadDate) {
      const year = new Date(book.lastReadDate).getFullYear();
      if (!isNaN(year) && year > 1900) {
        years.add(year);
      }
    }
  });

  const yearSelect = document.getElementById('filter-year');
  if (yearSelect) {
    
    while (yearSelect.options.length > 1) {
      yearSelect.remove(1);
    }

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    console.log('Found years:', sortedYears);
    sortedYears.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });
  }

  console.log(`✅ Populated filters: ${genres.size} genres, ${authors.size} authors, ${years.size} years`);
}


function attachFilterEventListeners() {
  console.log('🔗 Attaching filter event listeners...');

  const statusFilter = document.getElementById('filter-status');
  const genreFilter = document.getElementById('filter-genre');
  const authorFilter = document.getElementById('filter-author');
  const yearFilter = document.getElementById('filter-year');
  const sortFilter = document.getElementById('sort-by');
  const clearButton = document.getElementById('clear-filters');

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      console.log('Status filter changed to:', e.target.value);
      currentFilters.status = e.target.value;
      applyFilters();
    });
    console.log('✅ Status filter listener attached');
  }

  if (genreFilter) {
    genreFilter.addEventListener('change', (e) => {
      console.log('Genre filter changed to:', e.target.value);
      currentFilters.genre = e.target.value;
      applyFilters();
    });
    console.log('✅ Genre filter listener attached');
  }

  if (authorFilter) {
    authorFilter.addEventListener('change', (e) => {
      console.log('Author filter changed to:', e.target.value);
      currentFilters.author = e.target.value;
      applyFilters();
    });
    console.log('✅ Author filter listener attached');
  }

  if (yearFilter) {
    yearFilter.addEventListener('change', (e) => {
      console.log('Year filter changed to:', e.target.value);
      currentFilters.year = e.target.value;
      applyFilters();
    });
    console.log('✅ Year filter listener attached');
  }

  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      console.log('Sort changed to:', e.target.value);
      currentFilters.sort = e.target.value;
      applyFilters();
    });
    console.log('✅ Sort listener attached');
  }

  if (clearButton) {
    clearButton.addEventListener('click', clearAllFilters);
    console.log('✅ Clear button listener attached');
  }
}


function applyFilters() {
  console.log('🔍 Applying filters:', currentFilters);

  
  filteredBooks = [...allBooks];

  
  if (currentFilters.status !== 'all') {
    filteredBooks = filteredBooks.filter(book => book.status === currentFilters.status);
  }

  
  if (currentFilters.genre !== 'all') {
    filteredBooks = filteredBooks.filter(book => book.genre === currentFilters.genre);
  }

  
  if (currentFilters.author !== 'all') {
    filteredBooks = filteredBooks.filter(book => book.author === currentFilters.author);
  }

  
  if (currentFilters.year !== 'all') {
    filteredBooks = filteredBooks.filter(book => {
      if (!book.lastReadDate) return false;
      const bookYear = new Date(book.lastReadDate).getFullYear();
      return bookYear === parseInt(currentFilters.year);
    });
  }

  
  sortBooks(filteredBooks, currentFilters.sort);

  
  displayFilteredBooks();
  updateActiveFilterTags();
  updateResultsCount();
}


function sortBooks(books, sortBy) {
  switch (sortBy) {
    case 'title':
      books.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'author':
      books.sort((a, b) => a.author.localeCompare(b.author));
      break;
    case 'rating':
      books.sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        return ratingB - ratingA;
      });
      break;
    case 'date-read':
      books.sort((a, b) => {
        const dateA = a.lastReadDate ? new Date(a.lastReadDate) : new Date(0);
        const dateB = b.lastReadDate ? new Date(b.lastReadDate) : new Date(0);
        return dateB - dateA;
      });
      break;
    case 'recent':
    default:
      
      break;
  }
}


async function displayFilteredBooks() {
  const libraryList = document.getElementById('complete-library-list');
  if (!libraryList) return;

  libraryList.innerHTML = '';

  if (filteredBooks.length === 0) {
    libraryList.innerHTML = `
      <div class="empty-state-inline">
        <div class="empty-icon">🔍</div>
        <h3>No Books Found</h3>
        <p>No books match your current filters. Try adjusting your filters.</p>
      </div>
    `;
    return;
  }

  
  for (const book of filteredBooks) {
    const bookInfo = await fetchBookInfo(book).catch(err => {
      console.warn("fetchBookInfo failed for", book.title, err);
      return {
        title: book.title,
        author: book.author || "Unknown",
        cover: `https://via.placeholder.com/160x220/667eea/ffffff?text=${encodeURIComponent(book.title.substring(0, 20))}`,
        pages: book.pages || 0,
        description: book.description || "",
        publisher: book.publisher || "",
        publishedDate: book.publishedDate || "",
        isbn: book.isbn || null
      };
    });

    const card = createBookCard(book, bookInfo);
    libraryList.appendChild(card);

    // Note: createBookCard already adds all necessary event listeners including:
    // - Click handler for flipping the card
    // - Edit and Delete button handlers
    // - Reading time editor for currently reading books
    // So we don't need to add them again here!
  }
}


function updateActiveFilterTags() {
  const activeFiltersDiv = document.getElementById('active-filters');
  const filterTagsDiv = document.getElementById('filter-tags');

  if (!activeFiltersDiv || !filterTagsDiv) return;

  filterTagsDiv.innerHTML = '';

  const hasActiveFilters =
    currentFilters.status !== 'all' ||
    currentFilters.genre !== 'all' ||
    currentFilters.author !== 'all' ||
    currentFilters.year !== 'all';

  if (hasActiveFilters) {
    activeFiltersDiv.style.display = 'flex';

    if (currentFilters.status !== 'all') {
      addFilterTag('Status', currentFilters.status, 'status');
    }

    if (currentFilters.genre !== 'all') {
      addFilterTag('Genre', currentFilters.genre, 'genre');
    }

    if (currentFilters.author !== 'all') {
      addFilterTag('Author', currentFilters.author, 'author');
    }

    if (currentFilters.year !== 'all') {
      addFilterTag('Year', currentFilters.year, 'year');
    }
  } else {
    activeFiltersDiv.style.display = 'none';
  }
}


function addFilterTag(label, value, filterType) {
  const filterTagsDiv = document.getElementById('filter-tags');
  if (!filterTagsDiv) return;

  const tag = document.createElement('span');
  tag.className = 'filter-tag';
  tag.innerHTML = `
    ${label}: ${value}
    <button class="remove-filter-tag" data-filter="${filterType}">×</button>
  `;

  const removeBtn = tag.querySelector('.remove-filter-tag');
  removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    removeFilter(filterType);
  });

  filterTagsDiv.appendChild(tag);
}


function removeFilter(filterType) {
  currentFilters[filterType] = 'all';

  
  const selectElement = document.getElementById(`filter-${filterType}`);
  if (selectElement) {
    selectElement.value = 'all';
  }

  applyFilters();
}


function clearAllFilters() {
  currentFilters = {
    status: 'all',
    genre: 'all',
    author: 'all',
    year: 'all',
    sort: 'recent'
  };

  
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-genre').value = 'all';
  document.getElementById('filter-author').value = 'all';
  document.getElementById('filter-year').value = 'all';
  document.getElementById('sort-by').value = 'recent';

  applyFilters();
}


function updateResultsCount() {
  const resultsCountDiv = document.getElementById('filter-results-count');
  if (!resultsCountDiv) return;

  const total = allBooks.length;
  const filtered = filteredBooks.length;

  if (filtered === total) {
    resultsCountDiv.textContent = `Showing all ${total} book${total !== 1 ? 's' : ''}`;
  } else {
    resultsCountDiv.textContent = `Showing ${filtered} of ${total} book${total !== 1 ? 's' : ''}`;
  }

  resultsCountDiv.style.display = 'block';
}


window.initializeLibraryFilters = initializeLibraryFilters;

console.log('✅ Library filters module loaded');
console.log('✅ initializeLibraryFilters function exported to window:', typeof window.initializeLibraryFilters);
