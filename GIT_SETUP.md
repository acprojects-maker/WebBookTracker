# Git Repository Setup Guide

Quick guide to initialize your Git repository and push to GitHub.

## Prerequisites

- Git installed on your computer
- GitHub account created
- Your code files ready in the project folder

## Step-by-Step Setup

### 1. Initialize Git Repository

Open terminal/command prompt in your project folder and run:

```bash
git init
```

This creates a new Git repository in your current directory.

### 2. Add All Files

```bash
git add .
```

This stages all files for commit (except those in `.gitignore`).

### 3. Verify What Will Be Committed

```bash
git status
```

**Important:** Check that `.env` is **NOT** listed. If you see it, STOP and fix your `.gitignore` file first.

You should see files like:
- ✅ index.html
- ✅ server.js
- ✅ package.json
- ✅ README.md
- ✅ .gitignore
- ❌ `.env` (should NOT appear - it's ignored)
- ❌ `node_modules/` (should NOT appear - it's ignored)

### 4. Create First Commit

```bash
git commit -m "Initial commit: Book Tracker application with AI-powered discovery"
```

### 5. Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the "+" icon (top right) → "New repository"
3. Fill in details:
   - **Repository name:** `WebBookTracker` (or your choice)
   - **Description:** "AI-powered book tracking and discovery application"
   - **Visibility:**
     - **Public** - Anyone can see (recommended for portfolio)
     - **Private** - Only you can see
   - **DON'T** initialize with README (you already have one)
   - **DON'T** add .gitignore (you already have one)
   - **License:** MIT License (you already have one)
4. Click "Create repository"

### 6. Connect to GitHub

GitHub will show you commands. Copy and run them:

```bash
git remote add origin https://github.com/YOUR-USERNAME/WebBookTracker.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

### 7. Verify Upload

Refresh your GitHub repository page. You should see all your files uploaded.

**Double-check:** Click on the repository and verify:
- ✅ All your HTML, CSS, JS files are there
- ✅ README.md is displayed on the homepage
- ✅ LICENSE file is recognized (GitHub will show "MIT License" badge)
- ❌ `.env` file is **NOT** visible (critical!)
- ❌ `node_modules/` folder is **NOT** visible

## Future Updates

After making changes to your code:

```bash
# Check what changed
git status

# Add specific files
git add file1.js file2.html

# Or add all changed files
git add .

# Commit with descriptive message
git commit -m "Add new feature: reading streak visualization"

# Push to GitHub
git push
```

## Recommended Git Workflow

### For Features
```bash
# Create a new branch for a feature
git checkout -b feature/add-social-sharing

# Make your changes, then commit
git add .
git commit -m "Add social sharing buttons"

# Push branch to GitHub
git push -u origin feature/add-social-sharing

# Create Pull Request on GitHub
# After merging, switch back to main
git checkout main
git pull
```

### For Bug Fixes
```bash
git checkout -b fix/email-verification-bug
# Make fixes
git commit -m "Fix email verification token expiry"
git push -u origin fix/email-verification-bug
```

## Common Git Commands

| Command | Description |
|---------|-------------|
| `git status` | Check current status and changes |
| `git log` | View commit history |
| `git diff` | See what changed |
| `git branch` | List all branches |
| `git checkout main` | Switch to main branch |
| `git pull` | Get latest changes from GitHub |
| `git clone <url>` | Clone a repository |
| `git remote -v` | Show remote repositories |

## Protecting Secrets

### Before Your First Commit

**Critical:** Ensure `.env` is in `.gitignore` BEFORE your first commit:

```bash
# Check if .env is ignored
git check-ignore .env
```

Should output: `.env` (meaning it's ignored ✅)

If it outputs nothing, add `.env` to `.gitignore`:

```bash
echo .env >> .gitignore
git add .gitignore
git commit -m "Update .gitignore to exclude .env"
```

### If You Accidentally Committed .env

**DANGER:** If you already committed `.env` with secrets:

1. **Remove from Git** (but keep locally):
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from version control"
   git push
   ```

2. **Rotate ALL API keys and secrets immediately:**
   - Gemini API key
   - Hugging Face API key
   - Cohere API key
   - JWT secret
   - Database password
   - SMTP password

3. **Clean Git history** (advanced - destroys history):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   git push --force --all
   ```

## GitHub Repository Settings

### Recommended Settings

1. **About section:**
   - Description: "AI-powered book tracking and discovery application"
   - Website: Your Vercel deployment URL
   - Topics: `book-tracker`, `reading`, `ai`, `gemini`, `nodejs`, `express`, `mysql`

2. **Security:**
   - Enable "Dependabot alerts"
   - Enable "Dependabot security updates"

3. **Branches:**
   - Protect `main` branch
   - Require pull request reviews (optional, for teams)

4. **Secrets (for CI/CD later):**
   - Add environment variables as GitHub Secrets
   - Never hardcode in workflow files

## Connecting to Render & Vercel

### For Render (Backend)
1. In Render dashboard, select "Connect to GitHub"
2. Authorize Render to access your repository
3. Select `WebBookTracker` repository
4. Render will auto-deploy on every push to `main`

### For Vercel (Frontend)
1. In Vercel dashboard, click "Import Project"
2. Select GitHub as source
3. Choose `WebBookTracker` repository
4. Vercel will auto-deploy on every push to `main`

**Auto-deployments:** Every time you push to GitHub, both services will automatically redeploy your app!

## Useful .gitignore Templates

Your `.gitignore` is based on:
- **Node.js** template (most important)
- **VisualStudioCode** template
- **macOS** template
- **Windows** template

This is the recommended combination for your project.

## Tips

1. **Commit often:** Small, focused commits are better than large ones
2. **Write descriptive commit messages:** Others (and future you) will thank you
3. **Use branches:** Keep `main` stable, develop in branches
4. **Review before committing:** Use `git diff` and `git status`
5. **Never commit secrets:** Always check `.env` is ignored
6. **Pull before push:** Avoid conflicts with `git pull` before `git push`

## Resources

- [GitHub Docs](https://docs.github.com)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message standard
- [GitHub Learning Lab](https://lab.github.com/) - Interactive tutorials

---

**Your repository is now properly configured for version control and deployment!** 🎉

