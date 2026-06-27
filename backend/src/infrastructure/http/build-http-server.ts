import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerInventoryRoutes } from '../../modules/inventory/infrastructure/http/inventory-routes.js';
import { registerPhotoAnalysisRoutes } from '../../modules/photo-analysis/infrastructure/http/photo-analysis-routes.js';
import { registerWriteOffsRoutes } from '../../modules/write-offs/infrastructure/http/write-offs-routes.js';

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
  await registerPhotoAnalysisRoutes(server);
  await registerWriteOffsRoutes(server);

  return server; // routes: health, inventory/variance, photo-analysis, write-offs
};
