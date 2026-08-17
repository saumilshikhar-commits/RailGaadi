# RailGaadi 🚆

> **Real-time Indian Railway telemetry dashboard** — live GPS, route maps, weather, elevation, and station ETAs for any of India's 13,000+ trains.

[![Built with React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-JS-blue)](https://maplibre.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org)

---

## ✨ Features

| Feature | Technology |
|---|---|
| 🗺️ Interactive Vector Map | MapLibre GL + MapTiler `dataviz-dark` tiles |
| 📡 Live Train Telemetry | RailRadar API (GPS, speed, delay, ETA) |
| ⛅ Station Weather | OpenWeather API (current, next, destination) |
| ⛰️ Terrain & Elevation | OpenTopography SRTM with hover inspection |
| 🧭 Geographic Context | Overpass OSM (rivers, mountains, bridges, monuments) |
| 🚉 Station Timeline | Full route schedule with completion progress & search filter |
| 💾 Favourites & History | Local storage, persistent across sessions |
| 🔗 Shareable Links | `/live/{trainNumber}` with tab hash persistence |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Two terminal windows (frontend + backend)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/railgaadi.git
cd railgaadi
npm install
cd server && npm install && cd ..
```

### 2. Configure Environment Variables

**Frontend** — copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3001
VITE_MAPTILER_API_KEY=GLZT0bA5P5y5xQPuy2Yl
```

**Backend** — create `server/.env`:
```env
NODE_ENV=development
PORT=3001
RAILRADAR_API_KEY=rg_1598fd24ba834eb89efe9997de6d9a75
OPENWEATHER_API_KEY=your_openweather_key
OPENTOPOGRAPHY_API_KEY=your_opentopography_key
MAPTILER_API_KEY=GLZT0bA5P5y5xQPuy2Yl
ALLOWED_ORIGINS=http://localhost:5173
RATE_LIMIT_SEARCH=30
RATE_LIMIT_LIVE=60
```

### 3. Start Development Servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# API running at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
npm run dev
# App running at http://localhost:5173
```

---

## 🔑 API Keys

| Provider | Key Variable | Get Free Key |
|---|---|---|
| RailRadar | `RAILRADAR_API_KEY` | [railradar.in](https://railradar.in) |
| MapTiler | `VITE_MAPTILER_API_KEY` | [maptiler.com](https://maptiler.com) |
| OpenWeather | `OPENWEATHER_API_KEY` | [openweathermap.org](https://openweathermap.org/api) |
| OpenTopography | `OPENTOPOGRAPHY_API_KEY` | [opentopography.org](https://opentopography.org) |
| Overpass OSM | *(none required)* | Public endpoint |

---

## 🛠️ Architecture

```
railgaadi/
├── src/                    # React frontend (Vite + TypeScript)
│   ├── api/client.ts       # Type-safe API client
│   ├── components/
│   │   ├── journey/        # StatusCard, StationTimeline, WeatherWidget, ElevationProfile, GeoContextWidget
│   │   ├── map/            # JourneyMap (MapLibre GL + MapTiler)
│   │   ├── search/         # TrainSearch with autocomplete
│   │   └── ui/             # ErrorBoundary, shared UI
│   ├── hooks/              # TanStack Query data hooks
│   ├── pages/
│   │   ├── Home/           # Landing page with search
│   │   └── Journey/        # Live tracking dashboard
│   └── stores/             # Zustand (map follow mode)
│
└── server/                 # Express backend (Node + TypeScript)
    ├── src/
    │   ├── api/routes/v1.ts        # All REST endpoints
    │   ├── cache/MemoryCache.ts    # In-memory TTL cache
    │   ├── middleware/             # requestId, X-Response-Time, validate
    │   ├── providers/
    │   │   ├── railradar/          # RailradarAdapter
    │   │   ├── openweather/        # OpenWeatherAdapter
    │   │   ├── opentopography/     # OpenTopographyAdapter
    │   │   └── overpass/           # OverpassAdapter
    │   └── utils/CircuitBreaker.ts # Provider fault isolation
    └── src/__tests__/api.test.ts   # Integration tests
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server health, uptime, memory, provider status |
| GET | `/api/v1/trains/search?q={query}` | Search trains by name or number |
| GET | `/api/v1/trains/{id}/journey` | Full route, stations, schedule |
| GET | `/api/v1/trains/{id}/live` | Live GPS, speed, delay, ETA |
| GET | `/api/v1/trains/{id}/weather` | Weather at current/next/destination |
| GET | `/api/v1/trains/{id}/elevation` | Terrain elevation profile along route |
| GET | `/api/v1/trains/{id}/context?categories=river,mountain` | OSM geographic features |
| GET | `/api/v1/dev/config` | Provider & circuit breaker states |

---

## 🧪 Running Tests

```bash
cd server

# Integration tests (requires dev server running on :3001)
node --test --import tsx/esm src/__tests__/api.test.ts
```

---

## 🏗️ Production Build

```bash
# Frontend
npm run build   # outputs to /dist

# Backend
cd server && npm run build  # compiles TypeScript to /dist
```

---

## 🛡️ Resilience Features (M6)

- **Circuit Breakers** — each provider (RailRadar, OpenWeather, OpenTopography, Overpass) trips independently after 3 failures, auto-recovers after 30s
- **Request Tracing** — every request gets `X-Request-Id` and `X-Response-Time` headers
- **Rate Limiting** — search: 30 req/min, live telemetry: 60 req/min
- **TTL Caching** — live data: 15s, journey: 5min, weather: 15min, elevation: 24h, geo context: 1h

---

## 🎨 Design System

- **Dark theme** — `#060b14` background, `#38bdf8` brand cyan
- **Typography** — Inter (Google Fonts)
- **Accessibility** — WCAG 2.2 AA: ARIA roles, live regions, reduced-motion, focus-visible
- **Animations** — micro-animations with `prefers-reduced-motion: reduce` fallback

---

*Built with ❤️ for Indian Railway travellers.*
