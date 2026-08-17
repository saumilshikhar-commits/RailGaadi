import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { requestId, notFound, errorHandler } from './middleware/common';
import v1Router from './api/routes/v1';

export function createApp() {
  const app = express();

  // ─── Security ──────────────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginEmbedderPolicy: false, // Allow MapLibre tiles
  }));

  // ─── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  app.use(cors({
    origin: config.NODE_ENV === 'development' ? true : allowedOrigins,
    credentials: false,
    exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
  }));

  // ─── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));

  // ─── Request ID + Response-Time ────────────────────────────────────────────
  app.use(requestId);

  // ─── Logging ───────────────────────────────────────────────────────────────
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // ─── Rate limiting ─────────────────────────────────────────────────────────
  app.use('/api/v1/trains/search', rateLimit({
    windowMs: 60_000,
    max: config.RATE_LIMIT_SEARCH,
    standardHeaders: true,
    legacyHeaders: false,
    message: errorLimitResponse('RATE_LIMITED', 'Too many search requests. Please wait before searching again.'),
  }));

  app.use('/api/v1/trains/:trainId/live', rateLimit({
    windowMs: 60_000,
    max: config.RATE_LIMIT_LIVE,
    standardHeaders: true,
    legacyHeaders: false,
    message: errorLimitResponse('RATE_LIMITED', 'Too many live status requests.'),
  }));

  // ─── Health ────────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    res.json({
      status: 'ok',
      service: 'railgaadi-api',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      env: config.NODE_ENV,
      uptime: {
        seconds: Math.round(uptime),
        human: formatUptime(uptime),
      },
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      providers: {
        railradar:      !!config.RAILRADAR_API_KEY,
        openWeather:    !!config.OPENWEATHER_API_KEY,
        openTopography: !!config.OPENTOPOGRAPHY_API_KEY,
        maptiler:       !!config.MAPTILER_API_KEY,
        overpass:       true,
      },
    });
  });

  // ─── Public app config (safe, frontend-facing) ────────────────────────────
  app.get('/api/config', (_req, res) => {
    res.json({
      mapTilerKey: config.MAPTILER_API_KEY ?? '',
      refreshIntervalMs: 30_000,
      jitterMs: 5_000,
    });
  });

  // ─── API routes ────────────────────────────────────────────────────────────
  app.use('/api/v1', v1Router);

  // ─── 404 + error handler ──────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

function errorLimitResponse(code: string, message: string) {
  return {
    data: null,
    meta: { requestId: 'rate-limited' },
    error: { code, message },
  };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
