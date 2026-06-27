import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export type WriteOffStatus = 'pending' | 'approved' | 'rejected';
export type WriteOffType = 'shtuchny' | 'vesovoy';

export type WriteOff = {
  id: string;
  employeeName: string;
  outletName: string;
  productName: string;
  type: WriteOffType;
  quantity: number;
  unit: string;
  reasonCode: string;
  comment: string | null;
  photoUrl: string | null;
  status: WriteOffStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
  rejectionReason: string | null;
};

const MOCK_WRITE_OFFS: WriteOff[] = [
  {
    id: '1',
    employeeName: 'Алия Сейткали',
    outletName: 'Mega Silk Way',
    productName: 'Говяжья котлета',
    type: 'shtuchny',
    quantity: 3,
    unit: 'шт',
    reasonCode: 'OVERCOOKED',
    comment: 'Пережарены во время обеда',
    photoUrl: null,
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    reviewedAt: null,
    reviewerName: null,
    rejectionReason: null,
  },
  {
    id: '2',
    employeeName: 'Данияр Ахметов',
    outletName: 'Mega Silk Way',
    productName: 'Картофель фри',
    type: 'vesovoy',
    quantity: 450,
    unit: 'г',
    reasonCode: 'EXPIRED',
    comment: null,
    photoUrl: null,
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    reviewedAt: null,
    reviewerName: null,
    rejectionReason: null,
  },
  {
    id: '3',
    employeeName: 'Айгуль Нурова',
    outletName: 'Dostyk Plaza',
    productName: 'Булочка бургерная',
    type: 'shtuchny',
    quantity: 6,
    unit: 'шт',
    reasonCode: 'DAMAGED',
    comment: 'Помялись при доставке',
    photoUrl: null,
    status: 'approved',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    reviewerName: 'Марат Исаев',
    rejectionReason: null,
  },
  {
    id: '4',
    employeeName: 'Нурлан Касымов',
    outletName: 'Dostyk Plaza',
    productName: 'Соус',
    type: 'vesovoy',
    quantity: 200,
    unit: 'г',
    reasonCode: 'EXPIRED',
    comment: null,
    photoUrl: null,
    status: 'rejected',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    reviewerName: 'Марат Исаев',
    rejectionReason: 'Недостаточно данных, переснимите фото',
  },
];

const reviewBody = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
});

export const registerWriteOffsRoutes = async (server: FastifyInstance): Promise<void> => {
  server.get('/write-offs', async (request) => {
    const query = request.query as Record<string, string>;
    let results = [...MOCK_WRITE_OFFS];

    if (query.status) {
      results = results.filter((w) => w.status === query.status);
    }
    if (query.outletName) {
      results = results.filter((w) => w.outletName === query.outletName);
    }

    return { data: results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  });

  server.get<{ Params: { id: string } }>('/write-offs/:id', async (request, reply) => {
    const item = MOCK_WRITE_OFFS.find((w) => w.id === request.params.id);
    if (!item) return reply.code(404).send({ error: 'Not found' });
    return { data: item };
  });

  server.patch<{ Params: { id: string } }>('/write-offs/:id/review', async (request, reply) => {
    const item = MOCK_WRITE_OFFS.find((w) => w.id === request.params.id);
    if (!item) return reply.code(404).send({ error: 'Not found' });
    if (item.status !== 'pending') return reply.code(409).send({ error: 'Already reviewed' });

    const body = reviewBody.parse(request.body);
    item.status = body.status;
    item.reviewedAt = new Date().toISOString();
    item.reviewerName = 'Reviewer';
    item.rejectionReason = body.rejectionReason ?? null;

    return { data: item };
  });
};
