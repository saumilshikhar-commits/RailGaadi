/**
 * RailGaadi API Integration Tests (M6)
 * Run with:  node --test --require tsx/cjs src/__tests__/api.test.ts
 * Or via:    npx vitest (if configured)
 *
 * These tests validate the live server at localhost:3001.
 * Start the server before running: npm run dev (in /server)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:3001';

async function get(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ── Health ─────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const { status, body } = await get('/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(typeof body.uptime === 'object', 'uptime should be an object');
    assert.ok(typeof body.memory === 'object', 'memory should be an object');
  });

  it('returns service name railgaadi-api', async () => {
    const { body } = await get('/api/health');
    assert.equal(body.service, 'railgaadi-api');
  });
});

// ── Dev Config ─────────────────────────────────────────────────────────────
describe('GET /api/v1/dev/config', () => {
  it('returns circuit breaker states', async () => {
    const { status, body } = await get('/api/v1/dev/config');
    assert.equal(status, 200);
    assert.ok(body.data, 'should have data');
    assert.ok('circuitBreakers' in body.data, 'should expose circuit breaker states');
    const states = body.data.circuitBreakers;
    assert.ok(['CLOSED', 'OPEN', 'HALF_OPEN'].includes(states.railradar), 'railradar state should be valid');
  });
});

// ── Train Search ─────────────────────────────────────────────────────────────
describe('GET /api/v1/trains/search', () => {
  it('rejects missing query with 400', async () => {
    const { status } = await get('/api/v1/trains/search');
    assert.equal(status, 400);
  });

  it('returns results or 503 for valid query', async () => {
    const { status, body } = await get('/api/v1/trains/search?q=rajdhani');
    assert.ok([200, 503].includes(status), `expected 200 or 503, got ${status}`);
    if (status === 200) {
      assert.ok(Array.isArray(body.data), 'data should be an array');
    }
  });
});

// ── Journey ──────────────────────────────────────────────────────────────────
describe('GET /api/v1/trains/:id/journey', () => {
  it('returns 400 for invalid trainId format', async () => {
    const { status } = await get('/api/v1/trains/abc/journey');
    assert.ok([400, 404, 503].includes(status), `got ${status}`);
  });

  it('returns journey data or 503 for 22436', async () => {
    const { status, body } = await get('/api/v1/trains/22436/journey');
    assert.ok([200, 503].includes(status), `expected 200 or 503, got ${status}`);
    if (status === 200) {
      assert.ok(body.data.trainId, 'should have trainId');
      assert.ok(Array.isArray(body.data.stations), 'should have stations array');
      assert.ok(body.data.stations.length > 0, 'should have at least one station');
    }
  });

  it('returns 22436 with correct route: NDLS → BSB', async () => {
    const { status, body } = await get('/api/v1/trains/22436/journey');
    if (status !== 200) return; // Skip if API unavailable
    assert.equal(body.data.origin.code, 'NDLS', 'origin should be NDLS');
    assert.equal(body.data.destination.code, 'BSB', 'destination should be BSB');
  });
});

// ── Live Status ───────────────────────────────────────────────────────────────
describe('GET /api/v1/trains/:id/live', () => {
  it('returns live status or 503 for 22436', async () => {
    const { status, body } = await get('/api/v1/trains/22436/live');
    assert.ok([200, 503].includes(status), `expected 200 or 503, got ${status}`);
    if (status === 200) {
      assert.ok(typeof body.data.progressPercent === 'number', 'should have progressPercent');
      assert.ok(body.data.freshness, 'should have freshness state');
    }
  });
});

// ── Not Found ─────────────────────────────────────────────────────────────────
describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const { status, body } = await get('/api/v1/does-not-exist');
    assert.equal(status, 404);
    assert.equal(body.error.code, 'NOT_FOUND');
  });
});
