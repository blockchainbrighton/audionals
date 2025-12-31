Here is the **Getting Started** guide rewritten in a clean, structured Markdown format.

# 🚀 Getting Started - Audiobook Studio

## ⚡ 5-Minute Quick Start

Follow these steps to get the system running locally.

### Prerequisites

* **Docker & Docker Compose** installed and running.
* **RAM:** 8GB minimum available.
* **Storage:** 50GB free disk space.

### Step 1: Clone & Setup

```bash
# Clone repository
git clone https://github.com/yourusername/audiobook-studio.git
cd audiobook-studio

# Copy environment file
cp .env.example .env

```

### Step 2: Start Services

Choose **one** of the following methods:

**Option A: Using Quick Start Script (Recommended)**

```bash
./scripts/quickstart.sh start

```

**Option B: Using Docker Compose**

```bash
docker-compose up -d

```

### Step 3: Verify Installation

```bash
# Check that all services are up
docker-compose ps

# Monitor logs for startup errors
docker-compose logs -f

```

### Step 4: Access Application

Open your browser to the following endpoints:

* **Frontend UI:** `http://localhost:5173`
* **Backend API:** `http://localhost:3000`
* **TTS Engine:** `http://localhost:5000`

---

## 📂 Project Structure

```text
audiobook-studio/
├── frontend/                 # React + Vite application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── backend/                  # Node.js + Express API
│   ├── src/
│   ├── data/                 # Database & uploads (Volume mapped)
│   ├── package.json
│   └── Dockerfile
├── tts-engine/               # Python + FastAPI TTS
│   ├── app.py
│   ├── models/               # Cached TTS models
│   ├── requirements.txt
│   └── Dockerfile
├── nginx/                    # Reverse proxy config
│   └── nginx.conf
├── docs/                     # Documentation
│   ├── INSTALLATION.md
│   ├── USER_GUIDE.md
│   ├── API_REFERENCE.md
│   └── TROUBLESHOOTING.md
├── scripts/                  # Utility scripts
│   └── quickstart.sh
├── docker-compose.yml        # Orchestration config
├── .env.example              # Environment variables template
└── README.md                 # Project README

```

---

## 💻 Common Commands

### 🛠 Using Quick Start Script

The helper script located in `./scripts/` simplifies common operations.

```bash
# Start services
./scripts/quickstart.sh start

# Stop services
./scripts/quickstart.sh stop

# Restart services
./scripts/quickstart.sh restart

# View aggregated logs
./scripts/quickstart.sh logs

# Check system status
./scripts/quickstart.sh status

```

### 🐳 Using Docker Compose

Direct control over the containers.

```bash
# Start all services detached
docker-compose up -d

# Stop and remove containers
docker-compose down

# View live logs for specific services
docker-compose logs -f backend
docker-compose logs -f tts-engine

# Restart a specific service
docker-compose restart backend

# Execute command inside a container (e.g., DB migration)
docker-compose exec backend npm run migrate

```

---

## ⚙️ Configuration

### Environment Variables

Edit the `.env` file to customize your configuration.

```bash
# Frontend URLs
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Backend Settings
NODE_ENV=production
PORT=3000

# TTS Service Settings
TTS_SERVICE_URL=http://tts-engine:5000
TTS_FALLBACK_ENABLED=true

# Database Path
DATABASE_URL=sqlite:///./data/audiobook_studio.db

# Redis Connection
REDIS_URL=redis://redis:6379

```

*See [.env.example](https://www.google.com/search?q=.env.example) for the complete list of available variables.*

---

## 🏁 First Steps

Once the application is running, follow this workflow to create your first audiobook.

### 1. Create a Project

1. Navigate to `http://localhost:5173`.
2. Click **"New Project"**.
3. Enter the project title, description, language, and genre.
4. Click **"Create"**.

### 2. Upload Manuscript

1. Click **"Upload Manuscript"**.
2. Paste your text or import a file.
* *Tip:* Use `# Chapter Name` to automatically create chapter breaks.
* *Tip:* Use `* * *` to denote speaker changes (for multi-speaker mode).


3. Click **"Save"**.

### 3. Configure Voices

1. Select a narrator voice from the dropdown.
2. Adjust **Speed** (0.5x - 2.0x) and **Pitch** (0.5x - 2.0x).
3. Choose the desired **Emotion/Tone**.
4. Click **"Apply"**.

### 4. Generate Audio

1. Click **"Generate"**.
2. Monitor progress via the real-time progress bar.
3. Pause, Resume, or Cancel if necessary.
4. **Download** your files when processing is complete.

---

## 🔧 Troubleshooting

### Services Won't Start

```bash
# 1. Check logs for specific errors
docker-compose logs

# 2. Check for port conflicts (ensure 3000, 5000, 5173 are free)
lsof -i :3000
lsof -i :5000

# 3. Force a rebuild
docker-compose down
docker-compose up -d --build

```

### Out of Memory (OOM)

```bash
# 1. Check current container usage
docker stats

# 2. Switch to a lightweight TTS model in .env
TTS_MODEL=tts_models/en/ljspeech/glow-tts

# 3. Restart the engine
docker-compose restart tts-engine

```

### GPU Not Being Used

```bash
# 1. Verify host drivers
nvidia-smi

# 2. Check PyTorch visibility inside container
docker-compose exec tts-engine python -c "import torch; print(torch.cuda.is_available())"

# 3. Ensure .env is configured correctly
TTS_DEVICE=cuda

```

*For more detailed solutions, see [docs/TROUBLESHOOTING.md](https://www.google.com/search?q=docs/TROUBLESHOOTING.md).*

---

## 📚 Documentation Links

* **[README.md](README.md)** - Project overview
* **[INSTALLATION.md](https://www.google.com/search?q=docs/INSTALLATION.md)** - Detailed installation guide
* **[USER_GUIDE.md](https://www.google.com/search?q=docs/USER_GUIDE.md)** - Complete user manual
* **[DOCKER_GUIDE.md](https://www.google.com/search?q=docs/DOCKER_GUIDE.md)** - Docker operations
* **[API_REFERENCE.md](https://www.google.com/search?q=docs/API_REFERENCE.md)** - REST API documentation

---

## 💬 Support

* 🐛 **Issues:** [GitHub Issues](https://github.com/yourusername/audiobook-studio/issues)
* 🗣 **Discussions:** [GitHub Discussions](https://github.com/yourusername/audiobook-studio/discussions)
* ✉️ **Email:** support@audiobook-studio.com

---

## ➡️ Next Steps

1. ✅ **Installation complete**
2. 📖 Read **[USER_GUIDE.md](https://www.google.com/search?q=docs/USER_GUIDE.md)**
3. 🎤 Create your first audiobook
4. 🚀 Deploy to production (see **[docs/DEPLOYMENT.md](https://www.google.com/search?q=docs/DEPLOYMENT.md)**)

**Happy audiobook creation! 🎵**

---

