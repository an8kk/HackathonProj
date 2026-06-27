import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerInventoryRoutes } from '../../modules/inventory/infrastructure/http/inventory-routes.js';

export const buildHttpServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: true
  });

  await server.register(cors, {
    origin: true
  });

  server.get('/health', async () => ({
    status: 'ok',
    service: 'hackathon-backend'
  }));

  await registerInventoryRoutes(server);

  return server;
};
