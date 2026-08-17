# RailGaadi 🚆

> **Real-time Indian Railway telemetry dashboard** — live GPS, route maps, weather, elevation, and station ETAs for any of India's 13,000+ trains.

<p align="center">
  <img src="docs/screenshots/live_tracking.png" alt="RailGaadi Live Tracking Dashboard" width="100%">
</p>

<p align="center">
  A real-time railway intelligence dashboard for exploring train journeys across India.
</p>


[![Built with React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-JS-blue)](https://maplibre.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org)

---

## 🚆 What is RailGaadi?

RailGaadi is a real-time Indian railway intelligence dashboard built to provide a richer visual understanding of train journeys.

Instead of displaying only conventional train-running information, RailGaadi combines live railway telemetry with:

- 🗺️ Interactive vector maps
- 📍 Live train location
- 🚉 Station-by-station journey progress
- ⏱️ Delay and ETA information
- ⛅ Weather conditions
- ⛰️ Terrain and elevation data
- 🧭 Geographic context around the railway route

The application is designed around a simple idea:

> **Turn railway telemetry into a visual journey experience.**

Train data is dynamically fetched based on the selected train number, while supporting services provide additional geographic, weather, and terrain information.

---
## ⚙️ How It Works

```text
User searches for a train
        ↓
RailGaadi Backend
        ↓
Railway / Weather / Terrain APIs
        ↓
Data normalization + caching
        ↓
React Dashboard
        ↓
Live map + train telemetry
+ station timeline
+ weather
+ elevation
+ geographic context

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
## 📸 Screenshots

### 🏠 Homepage

<p align="center">
  <img src="docs/screenshots/homepage.png" alt="RailGaadi Homepage" width="100%">
</p>

### 🔎 Train Search

<p align="center">
  <img src="docs/screenshots/search_panel.png" alt="RailGaadi Train Search" width="100%">
</p>

### 📡 Live Train Tracking

<p align="center">
  <img src="docs/screenshots/live_tracking.png" alt="RailGaadi Live Train Tracking" width="100%">
</p>

### 🗺️ Interactive Vector Map

<p align="center">
  <img src="docs/screenshots/interactive_map.png" alt="RailGaadi Interactive Vector Map" width="100%">
</p>

### ⛅ Weather Companion

<p align="center">
  <img src="docs/screenshots/weather.png" alt="RailGaadi Weather Companion" width="100%">
</p>

### ⛰️ Terrain & Elevation

<p align="center">
  <img src="docs/screenshots/elevation.png" alt="RailGaadi Terrain and Elevation" width="100%">
</p>

---

## 🌐 Demo

> 🚧 A public demo is currently being prepared.

For now, RailGaadi can be run locally using the setup instructions below.

---

## ⭐ Key Highlights

- 🔎 Search trains by number or name
- 📡 Fetch live train telemetry from RailRadar
- 📍 Display the train's current geographic position
- 🗺️ Visualize journeys using MapLibre GL and MapTiler
- 🚉 Track station-by-station journey progress
- ⛅ View weather around relevant stations
- ⛰️ Explore terrain and elevation along the journey
- 🧭 Display geographic context using OpenStreetMap data
- 🔗 Open shareable train tracking URLs using `/live/{trainNumber}`
- 💾 Persist favourites and recently viewed trains locally
- 🔄 Refresh live telemetry without recreating the map

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

## 🏗️ Architecture

RailGaadi follows a provider-based architecture where external data sources are isolated behind backend adapters.

This allows railway, weather, terrain and geographic services to be consumed through a consistent internal interface.

```text
                         ┌──────────────────┐
                         │   React Client   │
                         │ TypeScript + Vite│
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Express API    │
                         │   Node + TS      │
                         └────────┬─────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
       ┌────────────┐      ┌────────────┐      ┌──────────────┐
       │ RailRadar  │      │ OpenWeather│      │ OpenTopo-    │
       │ Telemetry  │      │ Weather    │      │ graphy       │
       └────────────┘      └────────────┘      └──────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Overpass / OSM   │
                         │ Geographic Data  │
                         └──────────────────┘

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

## 🤝 Contributing

Contributions, suggestions and improvements are welcome.

### 1. Fork the repository

Create your own fork of the RailGaadi repository.

### 2. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/RailGaadi.git
cd RailGaadi

---

## 🙏 Acknowledgements

RailGaadi is built using and integrating several open data sources and developer platforms:

- [RailRadar](https://railradar.in/) — railway telemetry
- [MapTiler](https://www.maptiler.com/) — vector map tiles
- [MapLibre GL JS](https://maplibre.org/) — interactive map rendering
- [OpenStreetMap](https://www.openstreetmap.org/) — geographic data
- [Overpass API](https://overpass-api.de/) — OpenStreetMap data queries
- [OpenWeather](https://openweathermap.org/) — weather information
- [OpenTopography](https://opentopography.org/) — terrain and elevation data

---

# 14. Add License

At the bottom of the README, add:

```md
## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ and TypeScript for Indian railway travellers.
</p>
