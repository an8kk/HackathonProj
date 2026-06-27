import { buildHttpServer } from './infrastructure/http/build-http-server.js';

const port = Number(process.env.BACKEND_PORT ?? 4000);
const host = process.env.BACKEND_HOST ?? '0.0.0.0';

const server = await buildHttpServer();

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
