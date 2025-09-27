# TimeTide — Smart Time Management

TimeTide is a full‑stack productivity app with a focus timer, analytics, gamified streaks, and a contextual chat assistant that helps you stay on task. It’s built with a modern React + Vite front end and a Node/Express + MongoDB back end.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running in Development](#running-in-development)
- [Production Build](#production-build)
- [Key Frontend Components](#key-frontend-components)
- [Key Backend Endpoints](#key-backend-endpoints)
- [Styling & Theming](#styling--theming)
- [Notifications & Sounds](#notifications--sounds)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features
- **Pomodoro-style timer** with start/stop, persistent state, and auto-resume.
- **Chat Assistant** in the bottom‑right corner that opens when you stop a session, asks why, and suggests actionable focus tips. Suggestions are varied and context‑aware.
- **Streak badge** in the navbar that reflects consecutive active days. Uses local session data, so it works even if a special API isn’t present.
- **Analytics** for historical sessions and weekly progress.
- **Dark/Light themes** with a refreshed Landing page featuring gradients and glass cards.
- **Productivity sounds and notifications** on session completion with adjustable volume and enable/disable controls.

## Architecture
- `frontend/` — React (Vite) SPA
  - Routing with `react-router-dom`
  - REST calls via Axios to `/api/*`
  - CSS: custom styles in `frontend/src/styles/index.css` (theme‑aware)
- `backend/` — Node.js + Express API
  - MongoDB (Mongoose) for persistence
  - REST endpoints under `/api`
  - CORS + cookie‑based session support (as configured in server)

## Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (local or cloud)

## Quick Start
1. Clone the repository and install dependencies:
   - Backend
     - `cd backend`
     - `npm install`
   - Frontend
     - `cd frontend`
     - `npm install`
2. Create environment variables (see below) in `backend/.env`.
3. Start both servers (in two terminals):
   - Backend: `cd backend && node server.js`
   - Frontend: `cd frontend && npm run dev`
4. Open the app at http://localhost:3001

## Environment Variables
Create `backend/.env` and set:
- `MONGODB_URI` — your Mongo connection string (if not set, server may use a default/local)
- `PORT` — backend port (defaults to 5000)
- `OPENWEATHER_API_KEY` — for weather widget (optional)
- `GEMINI_API_KEY` — reserved for future AI integrations (optional; not required for local suggestions)

Note: Frontend proxies `/api` to the backend at `http://localhost:5000` (see `frontend/vite.config.js`).

## Running in Development
- Backend: `cd backend && node server.js`
  - Server runs at http://localhost:5000
  - API base path: `http://localhost:5000/api`
- Frontend: `cd frontend && npm run dev`
  - Vite dev server runs at http://localhost:3001
  - Proxy for `/api` → http://localhost:5000

## Production Build
- Frontend build: `cd frontend && npm run build`
  - Outputs to `frontend/dist/`
- You can serve the built assets with any static host and point it to the backend’s `/api`.

## Key Frontend Components
- `src/components/Timer.jsx`
  - Core focus timer with persistence in `localStorage`.
  - Plays completion sounds and can show browser notifications.
- `src/components/ChatAssistant.jsx`
  - Floating bottom‑right assistant.
  - Auto‑opens on manual stop and asks for a reason.
  - Suggests focus tips based on the reason; keeps variety and avoids repetition.
- `src/components/Dashboard.jsx`
  - Main app view with timer, analytics section, and streak badge.
- `src/components/StreakBadge.jsx`
  - Computes streak from sessions (no special endpoint required).
- `src/components/Landing.jsx`
  - Landing page with theme‑aware vibrant gradients and glass cards.

## Key Backend Endpoints
Base path: `/api`
- `POST /auth/login` — authenticate user
- `POST /auth/signup` — create user
- `POST /auth/logout` — log out
- `GET  /auth/check` — returns authenticated user
- `GET  /sessions` — list user sessions
- `POST /sessions` — create a session entry
- `PUT  /sessions/:id/complete` — finalize a session with duration and metadata
- `GET  /sessions/analytics` — analytics data (if implemented)
- `GET  /leaderboard` — leaderboard data (if implemented)

Note: The streak badge currently relies on `/api/sessions` to compute streak locally on the client.

## Styling & Theming
- Global styles: `frontend/src/styles/index.css`
- Theme detection: `data-theme` attribute (`light` or `dark`) on `<html>`
- Landing page upgrades include:
  - Layered gradients for hero and CTA
  - Glassmorphism feature cards
  - Subtle grid overlay and vignette in light mode

## Notifications & Sounds
- See `frontend/src/utils/soundUtils.js` (SoundManager)
- Features:
  - Multi‑tone completion sound
  - Volume control and enable/disable toggle
  - Browser notifications (with permission handling)
  - Preferences persisted in `localStorage`

## Troubleshooting
- **Frontend can’t reach API**
  - Ensure backend is running at `http://localhost:5000`.
  - Vite proxies `/api` to 5000; verify `frontend/vite.config.js`.
- **MongoDB errors**
  - Check `MONGODB_URI` in `backend/.env`.
- **Sounds don’t play**
  - Browser may require interaction; use the Test Sound button in timer settings.
- **Git push asks for identity**
  - Run:
    - `git config --global user.email "you@example.com"`
    - `git config --global user.name "Your Name"`
- **Streak shows 0**
  - Ensure you have sessions with valid `startTime` for recent days.

## License
This project is provided as‑is under the MIT License. See `LICENSE` if present.
