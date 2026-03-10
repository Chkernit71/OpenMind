# OpenMind AI Chat Widget Platform

OpenMind is a full-stack platform that allows website owners to easily integrate a custom AI chat assistant into their websites. It includes a backend API, a web dashboard for configuration and live monitoring, a web crawler to build an automated knowledge base, and an embeddable Javascript widget.

## 🌟 Key Features

- **Embeddable Chat Widget**: A lightweight, standalone Vanilla JS widget (`widget.js`) that works on any website with a single `<script>` tag.
- **Automated Web Crawler**: Automatically scrapes and indexes website content to feed context to the AI model.
- **Custom Knowledge Base**: Manually add FAQs, company details, or custom instructions to guide the AI behavior.
- **Live Conversation Monitoring**: Real-time websocket broadcasting allowing site owners to watch user conversations as they happen from the dashboard.
- **Chat Playground**: Test your bot's configuration and knowledge base in real-time before embedding it on your live site.
- **OpenAI Powered**: Uses OpenAI models (such as `gpt-5-nano` or `gpt-4o`) for highly quality, conversational chat experiences.

---

## 🏗️ Architecture & Tech Stack

### 1. Backend (`/backend`)
The core API server that handles chat routing, database interactions, web crawling, and WebSocket monitoring.
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy (Asynchronous)
- **AI Integrations**: OpenAI SDK
- **Task Running**: `httpx` and `BeautifulSoup4` for asynchronous website crawling.

### 2. Dashboard (`/dashboard`)
The web interface where site owners manage their AI configuration, view crawled pages, and monitor live chats.
- **Framework**: React.js with Vite
- **Styling**: Tailwind CSS
- **Data Fetching**: React Query & Axios
- **Icons**: Lucide React

### 3. Widget (`/widget`)
The script embedded on client websites.
- **Stack**: Pure Vanilla Javascript (ES6+) and CSS.
- **Features**: Highly resilient script tag detection, dynamic backend URL resolution, secure CORS communication, and isolated z-index styling.

---

## 📂 Project Structure

```text
OpenMind/
├── backend/                  # FastAPI Backend API
│   ├── main.py               # Application entry point & routing 
│   ├── models/               # SQLAlchemy DB Models (Site, Message, User)
│   ├── routers/              # API Endpoints (auth, chat, sites, ws)
│   ├── services/             # Core Logic (ai.py, crawler.py, ws_manager.py)
│   ├── db/                   # Database connection setup
│   └── requirements.txt      # Python dependencies
├── dashboard/                # React Admin Dashboard
│   ├── src/                  # React components and pages
│   ├── vite.config.js        # Vite build configuration
│   └── package.json          # Node dependencies
├── widget/                   # Embeddable Client Widget
│   └── widget.js             # The lightweight JS bundle distributed to websites
├── deploy.sh                 # Automated VPS deployment script
└── test_bot.html             # Local HTML sandbox for testing widget rendering
```

---

## 🚀 Setting Up for Local Development

### 1. Backend Setup
Create an isolated environment and install the dependencies:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder:
```env
DATABASE_URL=sqlite+aiosqlite:///./openmind.db
SECRET_KEY=dev-secret-key
OPENAI_API_KEY=sk-your-openai-api-key
BACKEND_URL=http://localhost:8080
```

Start the backend API and serve the static files:
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```

### 2. Frontend Setup (Dashboard)
In a separate terminal, install and run the React frontend:
```bash
cd dashboard
npm install
npm run dev
```

---

## 🌍 Production Deployment

The project is designed to be fully self-contained in production, meaning the FastAPI backend serves both the API and the compiled React static files on a single port.

1. **Build the Dashboard:**
   ```bash
   cd dashboard
   npm install && npm run build
   ```
2. **Setup the Production Environment:**
   Run the backend with PM2 or systemd explicitly passing `APP_ENV=production`. This creates a separate `openmind_prod.db` to isolate production data from local testing data.
   ```bash
   export APP_ENV=production
   pm2 start backend/venv/bin/uvicorn --name "openmind-api" -- backend.main:app --host 0.0.0.0 --port 8080
   ```

3. **Secure Tunneling (Cloudflare Tunnels)**:
   For live production testing without tedious DNS/SSL setups, use `cloudflared` to expose port 8080 to an encrypted HTTPS domain. Update your `.env` `BACKEND_URL` to match this Cloudflare domain so the widget initializes properly.
