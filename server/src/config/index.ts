import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const configSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Redis
  REDIS_URL: z.string().optional(),

  // Database
  DATABASE_URL: z.string().optional(),

  // Railradar
  RAILRADAR_BASE_URL: z.string().default('https://railradar.in/api/v1'),
  RAILRADAR_API_KEY: z.string().optional(),

  // OpenWeather
  OPENWEATHER_API_KEY: z.string().optional(),
  OPENWEATHER_BASE_URL: z.string().default('https://api.openweathermap.org/data/2.5'),

  // OpenTopography
  OPENTOPOGRAPHY_API_KEY: z.string().optional(),
  OPENTOPOGRAPHY_BASE_URL: z.string().default('https://portal.opentopography.org/API'),

  // Overpass
  OVERPASS_BASE_URL: z.string().default('https://overpass-api.de/api'),

  // MapTiler (exposed to frontend via /api/config)
  MAPTILER_API_KEY: z.string().optional(),

  // Cache TTLs (seconds)
  CACHE_TTL_SEARCH: z.string().default('600').transform(Number),
  CACHE_TTL_JOURNEY: z.string().default('300').transform(Number),
  CACHE_TTL_LIVE: z.string().default('15').transform(Number),
  CACHE_TTL_WEATHER: z.string().default('600').transform(Number),
  CACHE_TTL_ELEVATION: z.string().default('604800').transform(Number),
  CACHE_TTL_CONTEXT: z.string().default('86400').transform(Number),

  // Rate limits (rpm)
  RATE_LIMIT_SEARCH: z.string().default('60').transform(Number),
  RATE_LIMIT_LIVE: z.string().default('120').transform(Number),
  RATE_LIMIT_WEATHER: z.string().default('30').transform(Number),
  RATE_LIMIT_CONTEXT: z.string().default('20').transform(Number),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
