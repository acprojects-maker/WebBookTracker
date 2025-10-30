# Book Tracker

A feature-rich, AI-powered book tracking and discovery application that helps you manage your reading journey, discover new books, and gain insights into your reading habits.

## Features

### Core Functionality
- **User Authentication** - Secure registration and login with JWT tokens
- **Email Verification** - Verify email addresses with token-based verification
- **Password Reset** - Secure password reset via email
- **Book Management** - Add, edit, and delete books with detailed information
- **Reading Progress** - Track reading progress, time spent, and pages read
- **Multiple Reading Statuses** - Organize books by status (Reading, Completed, Want to Read, etc.)

### AI-Powered Features
- **Semantic Search** - Find books using natural language queries
- **AI Book Discovery** - Get personalized book recommendations powered by Gemini AI
- **Intelligent Reranking** - Cohere AI reranks search results for better relevance
- **Smart Recommendations** - Contextual book suggestions based on your reading history

### Analytics & Insights
- **Reading Statistics** - Visualize reading time, books completed, and trends
- **Achievement System** - Unlock achievements as you reach reading milestones
- **Reading Streaks** - Track consecutive days of reading
- **Genre Analytics** - Analyze your reading patterns by genre
- **Custom Reading Lists** - Create and manage personalized reading lists

### User Experience
- **Dark/Light Theme** - Toggle between dark and light modes
- **Responsive Design** - Works beautifully on desktop, tablet, and mobile
- **Interactive Charts** - Beautiful data visualizations with Chart.js
- **Search & Filter** - Powerful search and filtering capabilities
- **Profile Management** - Customize your profile and reading goals

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with custom properties and animations
- **JavaScript (ES6+)** - Vanilla JavaScript with class-based architecture
- **Chart.js** - Data visualization

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MySQL** - Relational database
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Nodemailer** - Email sending

### AI Services
- **Google Gemini API** - AI-powered book discovery
- **Hugging Face** - Semantic embeddings
- **Cohere API** - Result reranking
- **Google Books API** - Book metadata

### Security & Performance
- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection
- **SSL/TLS** - Encrypted connections

## Project Structure

```
WebBookTracker/
├── Frontend Files
│   ├── index.html              # Dashboard/Home page
│   ├── login.html              # Login page
│   ├── discover.html           # AI-powered discovery
│   ├── library.html            # Book library view
│   ├── add-book.html           # Add/Edit books
│   ├── profile.html            # User profile
│   ├── forgot-password.html    # Password recovery
│   ├── reset-password.html     # Password reset form
│   ├── ai-dashboard.html       # AI analytics dashboard
│   └── debug.html              # Debug utilities
│
├── CSS Files
│   ├── style.css               # Main styles
│   ├── discover-enhanced.css   # Discovery page styles
│   └── modal-mobile.css        # Mobile modal styles
│
├── JavaScript Files
│   ├── config.js               # Environment configuration
│   ├── api.js                  # API client wrapper
│   ├── script.js               # Main dashboard logic
│   ├── discover-enhanced.js    # Discovery page logic
│   ├── library-filters.js      # Library filtering
│   ├── modal-functions.js      # Modal management
│   ├── semantic-search.js      # Semantic search engine
│   ├── gemini-enhancer.js      # Gemini AI integration
│   ├── cohere-reranker.js      # Cohere reranking
│   ├── huggingface-embeddings.js # HF embeddings
│   ├── analytics-tracker.js    # Analytics tracking
│   └── explanation-service.js  # AI explanations
│
├── Backend Files
│   └── server.js               # Express server (2200+ lines)
│
├── Configuration Files
│   ├── package.json            # Dependencies
│   ├── .env.example            # Environment variables template
│   ├── .env.production.example # Production config template
│   ├── .gitignore              # Git ignore rules
│   ├── vercel.json             # Vercel deployment config
│   ├── render.yaml             # Render deployment config
│   └── database-schema.sql     # Database schema
│
└── Documentation
    ├── README.md               # This file
    └── DEPLOYMENT.md           # Deployment guide
```

## Getting Started

### Prerequisites
- **Node.js** 14.x or higher
- **MySQL** 5.7 or higher
- **npm** or **yarn**
- API keys for AI services (optional for basic functionality)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd WebBookTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - Database credentials
   - JWT secret
   - SMTP settings for email
   - AI API keys (optional)

4. **Initialize the database**

   Option A: Automatic (when starting server)
   ```bash
   npm start
   ```

   Option B: Manual (using MySQL client)
   ```bash
   mysql -u root -p < database-schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:9000
   ```

### Default Port
The server runs on port `9000` by default. You can change this in `.env`:
```env
PORT=9000
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon (auto-reload)

### Environment Variables

See `.env.example` for all available configuration options:

**Required:**
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database credentials
- `JWT_SECRET` - Secret key for JWT tokens
- `SMTP_*` - Email service configuration

**Optional:**
- `GEMINI_API_KEY` - Google Gemini for AI discovery
- `HF_API_KEY` - Hugging Face for semantic search
- `COHERE_API_KEY` - Cohere for result reranking
- `GOOGLE_BOOKS_API_KEY` - Google Books metadata

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Book Endpoints
- `GET /api/books` - Get all books for user
- `POST /api/books` - Add new book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book
- `GET /api/books/:id` - Get book details

### Statistics Endpoints
- `GET /api/stats` - Get reading statistics
- `GET /api/stats/achievements` - Get user achievements
- `GET /api/stats/streak` - Get reading streak

### Discovery Endpoints
- `GET /api/discovery/search` - Search books
- `POST /api/discovery/recommendations` - Get AI recommendations

### Reading List Endpoints
- `GET /api/reading-lists` - Get all reading lists
- `POST /api/reading-lists` - Create reading list
- `PUT /api/reading-lists/:id` - Update reading list
- `DELETE /api/reading-lists/:id` - Delete reading list

Full API documentation available at `/` endpoint when server is running.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions using:
- **Vercel** (Frontend)
- **Render** (Backend)
- **PlanetScale** (Database)
- **Brevo** (Email)

All services offer free tiers suitable for getting started.

## Security

### Implemented Security Measures
- Password hashing with bcrypt
- JWT token-based authentication
- Email verification
- Rate limiting on API endpoints
- Helmet.js security headers
- CORS protection
- SQL injection prevention with parameterized queries
- XSS protection
- Request body size limits

### Security Best Practices
- Never commit `.env` file
- Rotate API keys regularly
- Use strong JWT secrets (64+ characters)
- Enable HTTPS in production
- Use environment-specific API keys
- Monitor API usage for anomalies

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

Note: Modern JavaScript features (ES6+) are used. For older browser support, transpilation with Babel would be required.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The MIT License is a permissive open-source license that allows you to:
- ✅ Use commercially
- ✅ Modify the code
- ✅ Distribute copies
- ✅ Use privately
- ✅ Sublicense

With the following requirements:
- Include the license and copyright notice in all copies or substantial portions of the software

## Acknowledgments

- **Chart.js** - Beautiful charts and graphs
- **Google Gemini** - AI-powered recommendations
- **Hugging Face** - Semantic embeddings
- **Cohere** - Result reranking
- **Google Books API** - Book metadata

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team

## Roadmap

### Planned Features
- [ ] Mobile app (React Native)
- [ ] Social features (friend recommendations, book clubs)
- [ ] Export/import data (CSV, JSON)
- [ ] Goodreads integration
- [ ] Audiobook support
- [ ] Reading challenges
- [ ] Book barcode scanning
- [ ] Offline mode (PWA)
- [ ] Multi-language support
- [ ] Dark mode scheduling

---

**Built with ❤️ for book lovers**
