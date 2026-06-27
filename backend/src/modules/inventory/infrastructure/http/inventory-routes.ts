import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { calculateInventoryVariance } from '../../application/use-cases/calculate-inventory-variance.js';

const inventoryVarianceRequest = z.object({
  openingStock: z.number().nonnegative(),
  purchases: z.number().nonnegative(),
  closingStock: z.number().nonnegative(),
  salesUsage: z.number().nonnegative(),
  unitCost: z.number().nonnegative()
});

export const registerInventoryRoutes = async (server: FastifyInstance): Promise<void> => {
  server.post('/inventory/variance', async (request, reply) => {
    const payload = inventoryVarianceRequest.parse(request.body);
    const report = calculateInventoryVariance(payload);

    return reply.code(200).send(report);
  });
};
