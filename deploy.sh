#!/bin/bash

# OpenMind Automated VPS Deployment Script
# Run this script on a fresh Ubuntu 22.04 or 24.04 VPS

set -e # Exit immediately if a command exits with a non-zero status

# 1. Update System and Install Dependencies
echo "🚀 Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "📦 Installing Python, Git, and utilities..."
sudo apt install -y python3 python3-venv python3-pip git curl software-properties-common

echo "🟢 Installing Node.js (v20)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Clone the Repository
echo "📥 Cloning OpenMind repository..."
if [ -d "OpenMind" ]; then
    echo "⚠️ Directory 'OpenMind' already exists. Pulling latest changes..."
    cd OpenMind
    git pull
else
    git clone https://github.com/Chkernit71/OpenMind.git
    cd OpenMind
fi

# 3. Setup Python Backend Environment
echo "🐍 Setting up Python virtual environment..."
python3 -m venv backend/venv
source backend/venv/bin/activate

echo "📚 Installing Python dependencies..."
pip install -r backend/requirements.txt

# 4. Prompt for Environment Variables (if .env doesn't exist)
if [ ! -f "backend/.env" ]; then
    echo "🔑 Configuring backend environment variables..."
    echo "Please enter your OpenAI API Key (sk-...):"
    read -p "> " OPENAI_KEY
    echo "Please enter your domain or public IP (e.g., https://your-domain.com):"
    read -p "> " BACKEND_URL

    cat <<EOT >> backend/.env
DATABASE_URL=sqlite+aiosqlite:///./openmind_prod.db
SECRET_KEY=$(openssl rand -hex 32)
OPENAI_API_KEY=$OPENAI_KEY
BACKEND_URL=$BACKEND_URL
EOT
    echo "✅ backend/.env created!"
else
    echo "⏭️ backend/.env already exists, skipping creation."
fi

# 5. Build the Frontend Dashboard
echo "⚛️ Building the React dashboard..."
cd dashboard
npm install
npm run build
cd ..

# 6. Setup PM2 for Process Management
echo "⚙️ Installing PM2 to keep the server running..."
sudo npm install -g pm2

echo "▶️ Starting the FastAPI backend with PM2..."
APP_ENV=production pm2 start backend/venv/bin/uvicorn --name "openmind-api" -- backend.main:app --host 0.0.0.0 --port 8080

echo "💾 Saving PM2 configuration to start on boot..."
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER

# End of Script
echo ""
echo "🎉 DEPLOYMENT COMPLETE! 🎉"
echo "Your OpenMind API is now running on port 8080."
echo "You can check the logs anytime by running: pm2 logs openmind-api"
echo ""
echo "NOTE: If you are setting up HTTPS, don't forget to configure Cloudflare Tunnels (cloudflared) pointing to localhost:8080!"
