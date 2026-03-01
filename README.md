# OpenMind 🧠

OpenMind is an AI-powered SaaS platform that allows website owners to create custom AI assistants. By simply connecting a URL, OpenMind crawls the website's content and trains a specialized AI agent (GPT-4o) to answer visitor questions accurately and in a human-like tone.

## ✨ Features

- 🕷️ **Automated Crawling**: Instantly extract knowledge from any website URL.
- 💬 **Embeddable Widget**: A sleek, customizable chat bubble for any website.
- 🎨 **Chat Playground**: Test your bot's personality and knowledge before going live.
- 📝 **Manual Knowledge Base**: Supplement crawled data with custom FAQs and details.
- 📊 **Dashboard**: Manage multiple sites, bot configurations, and view conversations.
- 🔐 **Secure API**: Key-based authentication for the chat widget.

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **ORM**: SQLAlchemy 2.0
- **AI**: GPT-4o via GitHub Models
- **Scraping**: BeautifulSoup4 + HTTPX

### Frontend (Dashboard)
- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Query

### Widget
- **Core**: Vanilla JavaScript (Zero dependencies)
- **Communication**: REST API with X-Api-Key

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- GitHub Token (for AI features)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # venv\Scripts\activate on Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables in a `.env` file:
   ```env
   GITHUB_TOKEN=your_github_token_here
   SECRET_KEY=your_jwt_secret
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Dashboard Setup
1. Navigate to the dashboard directory:
   ```bash
   cd dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🧪 Testing the Widget
You can test the chat widget using the provided `test_bot.html` file in the root directory. Simply open it in your browser while the backend is running.

## 📄 License
MIT License - see the [LICENSE](LICENSE) file for details.
