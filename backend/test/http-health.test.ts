import { describe, expect, it } from 'vitest';
import { buildHttpServer } from '../src/infrastructure/http/build-http-server.js';

describe('HTTP server', () => {
  it('exposes service health', async () => {
    const server = await buildHttpServer();

    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'hackathon-backend' });

    await server.close();
  });
});
