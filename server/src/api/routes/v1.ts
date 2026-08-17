import { Router, Request, Response } from 'express';
import { RailradarAdapter } from '../../providers/railradar/RailradarAdapter';
import { OpenWeatherAdapter } from '../../providers/openweather/OpenWeatherAdapter';
import { OpenTopographyAdapter } from '../../providers/opentopography/OpenTopographyAdapter';
import { OverpassAdapter } from '../../providers/overpass/OverpassAdapter';
import { cache } from '../../cache/MemoryCache';
import { config } from '../../config';
import { successResponse, errorResponse } from '../response';
import {
  validateQuery,
  validateParams,
  searchQuerySchema,
  trainIdParamSchema,
  contextQuerySchema,
} from '../../middleware/validate';
import { CircuitBreaker } from '../../utils/CircuitBreaker';

const router = Router();
const trainProvider = new RailradarAdapter();
const weatherProvider = new OpenWeatherAdapter();
const terrainProvider = new OpenTopographyAdapter();
const geoProvider = new OverpassAdapter();

// ── Circuit Breakers per provider ──────────────────────────────────────────
const cb = {
  railradar:      new CircuitBreaker('railradar',      { failureThreshold: 5, resetTimeoutMs: 15_000 }),
  openweather:    new CircuitBreaker('openweather',    { failureThreshold: 5, resetTimeoutMs: 15_000 }),
  opentopography: new CircuitBreaker('opentopography', { failureThreshold: 5, resetTimeoutMs: 15_000 }),
  overpass:       new CircuitBreaker('overpass',       { failureThreshold: 5, resetTimeoutMs: 15_000 }),
};

// ─── GET /api/v1/dev/config ──────────────────────────────────────────────────
router.get('/dev/config', async (req: Request, res: Response): Promise<void> => {
  const requestId: string = (req as any).requestId;
  res.json(
    successResponse(
      {
        mapTiler:       !!config.MAPTILER_API_KEY,
        railradar:      !!config.RAILRADAR_API_KEY,
        openWeather:    !!config.OPENWEATHER_API_KEY,
        openTopography: !!config.OPENTOPOGRAPHY_API_KEY,
        overpass:       true,
        circuitBreakers: {
          railradar:      cb.railradar.getState(),
          openweather:    cb.openweather.getState(),
          opentopography: cb.opentopography.getState(),
          overpass:       cb.overpass.getState(),
        },
      },
      { requestId },
    ),
  );
});

// ─── GET /api/v1/trains/search ───────────────────────────────────────────────
router.get(
  '/trains/search',
  validateQuery(searchQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const { q } = (req as any).validatedQuery;
    const requestId: string = (req as any).requestId;
    const cacheKey = `search:${q.toLowerCase().trim()}`;

    try {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        res.json(successResponse(cached.data, { requestId, cached: true }));
        return;
      }

      const results = await cb.railradar.execute(() => trainProvider.searchTrains(q));
      await cache.set(cacheKey, results, config.CACHE_TTL_SEARCH);
      res.json(successResponse(results, { requestId }));
    } catch (err: any) {
      console.error('[Search]', err.message);
      res.status(503).json(
        errorResponse('PROVIDER_UNAVAILABLE', 'Train search is temporarily unavailable.', requestId),
      );
    }
  },
);

// ─── GET /api/v1/trains/:trainId/journey ─────────────────────────────────────
router.get(
  '/trains/:trainId/journey',
  validateParams(trainIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { trainId } = (req as any).validatedParams;
    const requestId: string = (req as any).requestId;
    const cacheKey = `journey:${trainId}`;

    try {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        res.json(successResponse(cached.data, { requestId, cached: true }));
        return;
      }

      const journey = await cb.railradar.execute(() => trainProvider.getJourney(trainId));
      await cache.set(cacheKey, journey, config.CACHE_TTL_JOURNEY);
      res.json(successResponse(journey, { requestId }));
    } catch (err: any) {
      console.error('[Journey]', err.message);
      const msg = String(err.message || '');
      if (msg.includes('404') || msg.toLowerCase().includes('not found') || msg.includes('TRAIN_NOT_FOUND')) {
        res.status(404).json(
          errorResponse('TRAIN_NOT_FOUND', `Train ${trainId} could not be found.`, requestId),
        );
        return;
      }
      res.status(503).json(
        errorResponse('PROVIDER_UNAVAILABLE', 'Journey data is temporarily unavailable.', requestId),
      );
    }
  },
);

// ─── GET /api/v1/trains/:trainId/live ────────────────────────────────────────
router.get(
  '/trains/:trainId/live',
  validateParams(trainIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { trainId } = (req as any).validatedParams;
    const requestId: string = (req as any).requestId;
    const cacheKey = `live:${trainId}`;

    try {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        res.json(successResponse(cached.data, { requestId, cached: true }));
        return;
      }

      const liveStatus = await cb.railradar.execute(() => trainProvider.getLiveStatus(trainId));
      await cache.set(cacheKey, liveStatus, config.CACHE_TTL_LIVE);
      res.json(successResponse(liveStatus, {
        requestId,
        updatedAt: liveStatus.sourceUpdatedAt,
        freshness: liveStatus.freshness,
      }));
    } catch (err: any) {
      console.error('[Live]', err.message);
      res.status(503).json(
        errorResponse('LIVE_UNAVAILABLE', 'Live status is temporarily unavailable.', requestId),
      );
    }
  },
);

// ─── GET /api/v1/trains/:trainId/weather ─────────────────────────────────────
router.get(
  '/trains/:trainId/weather',
  validateParams(trainIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { trainId } = (req as any).validatedParams;
    const requestId: string = (req as any).requestId;
    const cacheKey = `weather:${trainId}`;

    try {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        res.json(successResponse(cached.data, { requestId, cached: true }));
        return;
      }

      const [live, journey] = await Promise.all([
        trainProvider.getLiveStatus(trainId).catch(() => null),
        trainProvider.getJourney(trainId).catch(() => null),
      ]);

      if (!journey) {
        res.status(404).json(errorResponse('TRAIN_NOT_FOUND', 'Train not found.', requestId));
        return;
      }

      const weather = await cb.openweather.execute(() =>
        weatherProvider.getTrainWeather(trainId, {
          current:     live?.latitude && live?.longitude
            ? { lat: live.latitude, lon: live.longitude, name: live.currentStation?.name ?? live.originName }
            : undefined,
          next:        live?.nextStation?.latitude && live?.nextStation?.longitude
            ? { lat: live.nextStation.latitude, lon: live.nextStation.longitude, name: live.nextStation.name }
            : undefined,
          destination: journey.destination.latitude && journey.destination.longitude
            ? { lat: journey.destination.latitude, lon: journey.destination.longitude, name: journey.destination.name }
            : undefined,
        }),
      );

      await cache.set(cacheKey, weather, config.CACHE_TTL_WEATHER);
      res.json(successResponse(weather, { requestId }));
    } catch (err: any) {
      console.error('[Weather]', err.message);
      res.status(503).json(
        errorResponse('WEATHER_UNAVAILABLE', 'Weather data is temporarily unavailable.', requestId),
      );
    }
  },
);

// ─── GET /api/v1/trains/:trainId/elevation ───────────────────────────────────
router.get(
  '/trains/:trainId/elevation',
  validateParams(trainIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { trainId } = (req as any).validatedParams;
    const requestId: string = (req as any).requestId;
    const cacheKey = `elevation:${trainId}`;

    try {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        res.json(successResponse(cached.data, { requestId, cached: true }));
        return;
      }

      const journey = await trainProvider.getJourney(trainId);
      const elevation = await cb.opentopography.execute(() =>
        terrainProvider.getElevationProfile(journey.route, 25),
      );
      elevation.trainId = trainId;

      await cache.set(cacheKey, elevation, config.CACHE_TTL_ELEVATION);
      res.json(successResponse(elevation, { requestId }));
    } catch (err: any) {
      console.error('[Elevation]', err.message);
      res.status(503).json(
        errorResponse('ELEVATION_UNAVAILABLE', 'Elevation profile is temporarily unavailable.', requestId),
      );
    }
  },
);

// ─── GET /api/v1/trains/:trainId/context ─────────────────────────────────────
router.get(
  '/trains/:trainId/context',
  validateParams(trainIdParamSchema),
  validateQuery(contextQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const { trainId } = (req as any).validatedParams;
    const requestId: string = (req as any).requestId;
    const categories = (req as any).validatedQuery?.categories ?? [];
    const cacheKey = `context:${trainId}:${categories.join(',')}`;

    try {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        res.json(successResponse(cached.data, { requestId, cached: true }));
        return;
      }

      const journey = await trainProvider.getJourney(trainId);
      const features = await cb.overpass.execute(() =>
        geoProvider.getNearbyFeatures(journey.route, categories, 15),
      );

      await cache.set(cacheKey, features, config.CACHE_TTL_CONTEXT);
      res.json(successResponse(features, { requestId }));
    } catch (err: any) {
      console.error('[Context]', err.message);
      res.status(503).json(
        errorResponse('CONTEXT_UNAVAILABLE', 'Geographic context is temporarily unavailable.', requestId),
      );
    }
  },
);

export default router;
