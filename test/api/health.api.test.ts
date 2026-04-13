import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app/app.js';

describe('GET /api/v1/health', () => {
  it('returns 200 and healthy payload', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data.status', 'healthy');
    expect(typeof res.body?.data?.timestamp).toBe('string');
  });
});
