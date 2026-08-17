import { TrainProvider } from '../interfaces/TrainProvider';
import { Train, Journey, LiveStatus, FreshnessState, JourneyStation } from '../../types';
import { config } from '../../config';

// ─── RailRadar API Response Types ────────────────────────────────────────────

interface RRStation {
  code: string;
  name: string;
  lat?: number;
  lng?: number;
}

interface RRRouteStop {
  sequence: number;
  station: RRStation;
  isHalt?: boolean;
  arrival?: string;
  arrivalDay?: number;
  departure?: string;
  departureDay?: number;
  distance: number;
  speedToNextStationKmph?: number;
}

interface RRTrainDetails {
  number: string;
  name: string;
  type?: string;
  category?: string;
  source: RRStation;
  destination: RRStation;
  runDays?: string[];
  distance: number;
  duration?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  totalHalts?: number;
}

interface RRScheduleResponse {
  success: boolean;
  data: {
    train: RRTrainDetails;
    route: RRRouteStop[];
  };
}

interface RRLiveRouteStop {
  sequence: number;
  stationCode: string;
  stationName: string;
  isHalt?: boolean;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayMinutes?: number;
  delayArrival?: number;
  delayDeparture?: number;
  platform?: string;
  status?: string;
  distance?: number;
  lat?: number;
  lng?: number;
}

interface RRCurrentLocation {
  stationCode: string;
  stationName: string;
  sequence: number;
  status?: string;
  isHalt?: boolean;
  isActualPosition?: boolean;
  delayMinutes?: number;
  lat?: number;
  lng?: number;
}

interface RRNextHalt {
  stationCode: string;
  stationName: string;
  sequence: number;
  distance?: number;
  eta?: string;
  lat?: number;
  lng?: number;
}

interface RRLiveResponse {
  success: boolean;
  data: {
    trainNumber: string;
    trainName?: string;
    startDate?: string;
    lastUpdatedAt?: string;
    status: string;        // 'not-started' | 'running' | 'completed'
    train?: RRTrainDetails;
    isLive?: boolean;
    trackingMode?: string;
    currentLocation?: RRCurrentLocation;
    nextHalt?: RRNextHalt;
    delayMinutes?: number;
    route?: RRLiveRouteStop[];
    destinationEta?: string;
    distanceTravelled?: number;
    distanceRemaining?: number;
    speed?: number;
  };
}

interface RRRouteGeometry {
  success: boolean;
  data: {
    trainNumber: string;
    format: string;
    geojson: {
      type: string;
      geometry: {
        type: string;
        coordinates: [number, number][];
      };
    };
  };
}

interface RRLookupResponse {
  success: boolean;
  data: Record<string, string>; // trainNumber → trainName
}

// ─── Freshness Utilities ──────────────────────────────────────────────────────
const FRESHNESS_FRESH_THRESHOLD_MS = 2 * 60 * 1000;
const FRESHNESS_AGING_THRESHOLD_MS = 5 * 60 * 1000;

function classifyFreshness(sourceUpdatedAt: string | undefined): FreshnessState {
  if (!sourceUpdatedAt) return 'unknown';
  const age = Date.now() - new Date(sourceUpdatedAt).getTime();
  if (age <= FRESHNESS_FRESH_THRESHOLD_MS) return 'fresh';
  if (age <= FRESHNESS_AGING_THRESHOLD_MS) return 'aging';
  return 'stale';
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────
// ─── HTTP Helper with Cache & 429 Rate-Limit Retry ──────────────────────────────
const rrResponseCache = new Map<string, { data: any; expiry: number }>();

async function fetchRailradar<T>(path: string, options: { ttlMs?: number; retries?: number } = {}): Promise<T> {
  const { ttlMs = 0, retries = 3 } = options;

  // Serve from cache if available & unexpired
  if (ttlMs > 0 && rrResponseCache.has(path)) {
    const cached = rrResponseCache.get(path)!;
    if (cached.expiry > Date.now()) {
      return cached.data as T;
    }
  }

  const url = `${config.RAILRADAR_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'RailGaadi/1.0',
  };
  if (config.RAILRADAR_API_KEY) {
    headers['Authorization'] = `Bearer ${config.RAILRADAR_API_KEY}`;
  }

  let attempt = 0;
  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });

      // Exponential backoff retry on 429 Too Many Requests
      if (res.status === 429) {
        if (attempt <= retries) {
          const backoff = attempt * 500;
          console.warn(`[RailRadar Rate Limit 429] Retrying ${path} in ${backoff}ms (attempt ${attempt}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
      }

      if (!res.ok) {
        throw new Error(`RailRadar HTTP ${res.status}: ${res.statusText} (${url})`);
      }

      const json = await res.json() as any;
      if (json.success === false) {
        throw new Error(`RailRadar API error: ${json.error?.message ?? 'Unknown error'}`);
      }

      if (ttlMs > 0) {
        rrResponseCache.set(path, { data: json, expiry: Date.now() + ttlMs });
      }

      return json as T;
    } catch (err: any) {
      if (attempt > retries) throw err;
      if (err.name === 'AbortError') {
        console.warn(`[RailRadar Timeout] Retrying ${path} (attempt ${attempt}/${retries})...`);
      } else if (!err.message?.includes('429')) {
        await new Promise(resolve => setTimeout(resolve, 300 * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Failed to fetch from RailRadar after ${retries} attempts: ${path}`);
}

// ─── Adapter Class ────────────────────────────────────────────────────────────
export class RailradarAdapter implements TrainProvider {
  readonly name = 'railradar';

  private async getLookupDict(): Promise<Record<string, string>> {
    try {
      const res = await fetchRailradar<RRLookupResponse>('/lookup/trains', { ttlMs: 60 * 60 * 1000 });
      if (res.data && typeof res.data === 'object') {
        return res.data;
      }
    } catch (err: any) {
      console.warn(`[RailRadar lookup cache warning]: ${err.message}`);
    }
    return {};
  }

  async searchTrains(query: string): Promise<Train[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const dict = await this.getLookupDict();
    const entries = Object.entries(dict);

    if (entries.length > 0) {
      const matches = entries
        .filter(([num, name]) =>
          num.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q)
        )
        .slice(0, 15)
        .map(([num, name]): Train => ({
          id: num,
          number: num,
          name,
          provider: this.name,
        }));

      if (matches.length > 0) return matches;
    }

    if (/^\d{3,5}$/.test(q)) {
      try {
        const schedule = await fetchRailradar<RRScheduleResponse>(`/trains/${q}`, { ttlMs: 15 * 60 * 1000 });
        if (schedule.data?.train) {
          const t = schedule.data.train;
          return [{
            id: t.number,
            number: t.number,
            name: t.name,
            origin: t.source ? { id: t.source.code, code: t.source.code, name: t.source.name, latitude: t.source.lat, longitude: t.source.lng } : undefined,
            destination: t.destination ? { id: t.destination.code, code: t.destination.code, name: t.destination.name, latitude: t.destination.lat, longitude: t.destination.lng } : undefined,
            provider: this.name,
          }];
        }
      } catch (err: any) {
        console.warn(`[RailRadar schedule search failed for ${q}]: ${err.message}`);
      }
    }

    return [];
  }

  async getJourney(trainId: string): Promise<Journey> {
    const cleanId = trainId.trim();

    if (!config.RAILRADAR_API_KEY) {
      throw new Error(`RAILRADAR_API_KEY is not configured.`);
    }

    // 1. Fetch schedule (cached for 15 mins)
    let schedule: RRScheduleResponse;
    try {
      schedule = await fetchRailradar<RRScheduleResponse>(`/trains/${cleanId}`, { ttlMs: 15 * 60 * 1000 });
    } catch (err: any) {
      console.error(`[RailRadar Journey Error] Failed to fetch schedule for ${cleanId}: ${err.message}`);
      throw new Error(`TRAIN_NOT_FOUND: Train ${cleanId} could not be loaded from RailRadar.`);
    }

    if (!schedule?.data?.train || !schedule.data.route) {
      throw new Error(`TRAIN_NOT_FOUND: Invalid schedule data received for train ${cleanId}.`);
    }

    // 2. Fetch route geometry sequentially (cached for 15 mins)
    let routeGeo: RRRouteGeometry | null = null;
    try {
      routeGeo = await fetchRailradar<RRRouteGeometry>(`/trains/${cleanId}/route?format=geojson&stops=true`, { ttlMs: 15 * 60 * 1000 });
    } catch {
      // Ignore geometry rate limit or fetch error; will fallback to station coordinates
    }

    const { train, route: stops } = schedule.data;

    // Filter to halt stations (where train actually stops for passengers)
    const haltStops = stops.filter(s => s.isHalt);
    const stationListToUse = haltStops.length >= 2 ? haltStops : stops;

    const stations: JourneyStation[] = stationListToUse.map((s, idx): JourneyStation => ({
      station: {
        id: s.station.code,
        code: s.station.code,
        name: s.station.name,
        latitude: s.station.lat,
        longitude: s.station.lng,
      },
      sequence: s.sequence ?? idx + 1,
      scheduledArrival: s.arrival ? `2026-08-18T${s.arrival}:00.000Z` : undefined,
      scheduledDeparture: s.departure ? `2026-08-18T${s.departure}:00.000Z` : undefined,
      status: 'upcoming',
      distanceFromOriginKm: s.distance,
    }));

    // Extract high-resolution route coordinates
    let routeCoords: [number, number][] = [];
    if (routeGeo?.data?.geojson?.geometry?.coordinates?.length) {
      routeCoords = routeGeo.data.geojson.geometry.coordinates;
    } else {
      routeCoords = stops
        .filter(s => s.station.lng != null && s.station.lat != null)
        .map(s => [s.station.lng!, s.station.lat!]);
    }

    return {
      id: `${cleanId}-${new Date().toISOString().slice(0, 10)}`,
      trainId: cleanId,
      trainName: train.name,
      origin: {
        id: train.source.code,
        code: train.source.code,
        name: train.source.name,
        latitude: train.source.lat,
        longitude: train.source.lng,
      },
      destination: {
        id: train.destination.code,
        code: train.destination.code,
        name: train.destination.name,
        latitude: train.destination.lat,
        longitude: train.destination.lng,
      },
      stations,
      route: { type: 'LineString', coordinates: routeCoords },
      totalDistanceKm: train.distance,
      status: 'running',
    };
  }

  async getLiveStatus(trainId: string): Promise<LiveStatus> {
    const cleanId = trainId.trim();

    if (!config.RAILRADAR_API_KEY) {
      throw new Error(`RAILRADAR_API_KEY is not configured.`);
    }

    const now = new Date().toISOString();

    // 1. Fetch schedule (cached 15 mins - instant 0ms if getJourney was called)
    let schedule: RRScheduleResponse | null = null;
    try {
      schedule = await fetchRailradar<RRScheduleResponse>(`/trains/${cleanId}`, { ttlMs: 15 * 60 * 1000 });
    } catch {
      // ignore
    }
    const trainInfo = schedule?.data?.train;

    // 2. Fetch live status (cached 5s)
    let liveRes: RRLiveResponse | null = null;
    try {
      liveRes = await fetchRailradar<RRLiveResponse>(`/trains/${cleanId}/live`, { ttlMs: 5 * 1000 });
    } catch {
      // ignore
    }

    // Fallback if live endpoint fails but schedule exists
    if (!liveRes?.data) {
      if (trainInfo) {
        return {
          trainId: cleanId,
          trainName: trainInfo.name ?? `Train ${cleanId}`,
          latitude: trainInfo.source?.lat,
          longitude: trainInfo.source?.lng,
          originName: trainInfo.source?.name ?? '',
          destinationName: trainInfo.destination?.name ?? '',
          destinationEta: 'Scheduled',
          delayMinutes: 0,
          currentSpeedKmh: 0,
          distanceCoveredKm: 0,
          distanceRemainingKm: trainInfo.distance ?? 0,
          totalDistanceKm: trainInfo.distance ?? 0,
          progressPercent: 0,
          sourceUpdatedAt: now,
          receivedAt: now,
          freshness: 'unknown',
          status: 'not_started',
          isLiveGpsAvailable: false,
          trackingMode: 'scheduled',
          statusMessage: 'Scheduled route active',
        };
      }
      throw new Error(`LIVE_UNAVAILABLE: Train ${cleanId} live status unavailable.`);
    }

    const d = liveRes.data;

    const sourceUpdatedAt = d.lastUpdatedAt ?? now;
    const trainName = d.trainName ?? d.train?.name ?? trainInfo?.name ?? `Train ${cleanId}`;
    const activeTrainInfo = d.train ?? trainInfo;

    const currentLoc = d.currentLocation;
    const nextHalt = d.nextHalt;

    // Build complete map of station coordinates from schedule route
    const stationCoordsMap = new Map<string, { lat: number; lng: number }>();
    if (schedule?.data?.route) {
      for (const stop of schedule.data.route) {
        if (stop.station?.code && stop.station.lat != null && stop.station.lng != null) {
          stationCoordsMap.set(stop.station.code, { lat: stop.station.lat, lng: stop.station.lng });
        }
      }
    }
    if (trainInfo?.source?.code && trainInfo.source.lat != null && trainInfo.source.lng != null) {
      stationCoordsMap.set(trainInfo.source.code, { lat: trainInfo.source.lat, lng: trainInfo.source.lng });
    }
    if (trainInfo?.destination?.code && trainInfo.destination.lat != null && trainInfo.destination.lng != null) {
      stationCoordsMap.set(trainInfo.destination.code, { lat: trainInfo.destination.lat, lng: trainInfo.destination.lng });
    }

    const currentStop = d.route?.find(r => r.stationCode === currentLoc?.stationCode);
    const nextStop = d.route?.find(r => r.stationCode === nextHalt?.stationCode);

    // Calculate metrics strictly from API response
    const totalKm = trainInfo?.distance ?? 0;
    const currentSeq = currentLoc?.sequence ?? 0;
    const totalStops = d.route?.length ?? 1;

    const coveredKm = d.distanceTravelled ?? (totalKm > 0 ? Math.round((currentSeq / Math.max(totalStops, 1)) * totalKm) : 0);
    const remainingKm = d.distanceRemaining ?? Math.max(0, totalKm - coveredKm);
    const progressPct = totalKm > 0 ? Math.min(100, Math.max(0, (coveredKm / totalKm) * 100)) : 0;

    // Check if live GPS is available & active
    const isLiveGps = d.isLive === true && d.status !== 'not-started';
    const trackingMode = d.trackingMode ?? (isLiveGps ? 'real-time' : 'scheduled');

    let statusMsg = 'Live tracking active';
    if (!isLiveGps) {
      if (d.status === 'not-started') {
        statusMsg = 'Train scheduled — Live location at origin station';
      } else {
        statusMsg = 'Live location unavailable';
      }
    }

    // Latitude & Longitude from current station position or route interpolation
    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;

    if (currentLoc?.stationCode) {
      const curCoords = stationCoordsMap.get(currentLoc.stationCode);
      const nextCode = nextHalt?.stationCode || (d.route && d.route[currentSeq]?.stationCode);
      const nextCoords = nextCode ? stationCoordsMap.get(nextCode) : null;

      if (curCoords) {
        lat = curCoords.lat;
        lng = curCoords.lng;

        if ((currentLoc.status === 'departed' || currentLoc.status === 'in-transit') && (currentLoc as any).segmentProgress != null && nextCoords) {
          const prog = (currentLoc as any).segmentProgress as number;
          lat = lat + (nextCoords.lat - lat) * Math.min(1, Math.max(0, prog));
          lng = lng + (nextCoords.lng - lng) * Math.min(1, Math.max(0, prog));
        }
      } else {
        lat = currentLoc.lat ?? currentStop?.lat;
        lng = currentLoc.lng ?? currentStop?.lng;
      }
    }

    if (lat == null && activeTrainInfo?.source?.lat != null) {
      lat = activeTrainInfo.source.lat;
      lng = activeTrainInfo.source.lng;
    }
    const stationStatuses: Record<string, { status: string; delayMinutes?: number; actualArrival?: string; actualDeparture?: string; platform?: string }> = {};
    if (d.route && Array.isArray(d.route)) {
      for (const stop of d.route) {
        if (stop.stationCode) {
          const statusStr = stop.status === 'at-station' || stop.status === 'arrived' ? 'at_station' : stop.status === 'departed' ? 'departed' : 'upcoming';
          stationStatuses[stop.stationCode] = {
            status: statusStr,
            delayMinutes: stop.delayDeparture ?? stop.delayArrival ?? stop.delayMinutes,
            actualArrival: stop.actualArrival,
            actualDeparture: stop.actualDeparture,
            platform: stop.platform,
          };
        }
      }
    }

    return {
      trainId: cleanId,
      trainName,
      latitude: lat,
      longitude: lng,
      currentStation: currentLoc ? {
        id: currentLoc.stationCode,
        code: currentLoc.stationCode,
        name: currentLoc.stationName,
        latitude: lat,
        longitude: lng,
        platform: currentStop?.platform,
      } : undefined,
      nextStation: nextHalt ? {
        id: nextHalt.stationCode,
        code: nextHalt.stationCode,
        name: nextHalt.stationName,
        latitude: nextStop?.lat ?? (nextHalt.stationCode ? stationCoordsMap.get(nextHalt.stationCode)?.lat : undefined),
        longitude: nextStop?.lng ?? (nextHalt.stationCode ? stationCoordsMap.get(nextHalt.stationCode)?.lng : undefined),
      } : undefined,
      originName: trainInfo?.source?.name ?? '',
      destinationName: trainInfo?.destination?.name ?? '',
      etaNextStation: nextHalt?.eta,
      destinationEta: d.destinationEta ?? 'On Time',
      delayMinutes: d.delayMinutes ?? currentLoc?.delayMinutes ?? 0,
      currentSpeedKmh: isLiveGps ? (d.speed ?? 0) : 0,
      distanceCoveredKm: Math.round(coveredKm),
      distanceRemainingKm: Math.round(remainingKm),
      totalDistanceKm: totalKm,
      progressPercent: Math.round(progressPct),
      sourceUpdatedAt,
      receivedAt: now,
      freshness: classifyFreshness(sourceUpdatedAt),
      status: d.status === 'completed' ? 'completed' : d.status === 'not-started' ? 'not_started' : 'running',
      isLiveGpsAvailable: isLiveGps,
      trackingMode,
      statusMessage: statusMsg,
      stationStatuses,
    };
  }
}
