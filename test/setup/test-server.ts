import request from 'supertest';
import app from '../../src/app/app.js';

export function createApiClient() {
  return request(app);
}

export function createApiAgent() {
  return request.agent(app);
}
