import type { FastifyInstance } from 'fastify';

export const healthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/health', async () => ({
    status: 'ok',
    omega: 'ΩE',
    timestamp: new Date().toISOString(),
  }));
};
