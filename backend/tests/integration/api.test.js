import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

let app;

beforeAll(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    ML_ENGINE_URL: 'http://127.0.0.1:8000',
    ML_ENGINE_API_KEY: 'test-secret-0123456789',
    FRONTEND_URL: 'http://localhost:3000',
  });
  ({ default: app } = await import('../../src/app.js'));
});

describe('API', () => {
  it('GET /health responds ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('rejects /api/v1 requests without a bearer token', async () => {
    const res = await request(app).get('/api/v1/profile');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/bearer token/i);
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });

  it('allows CORS only for the configured frontend origin', async () => {
    const ok = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    const bad = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
