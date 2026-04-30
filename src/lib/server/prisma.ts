import { PrismaClient } from '@prisma/client';

import { env } from '$lib/server/env';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
	prismaSlowQueryHooked: boolean | undefined;
};

function createPrismaClient(): PrismaClient {
	const client = new PrismaClient({
		...(env.DATABASE_URL ? { datasourceUrl: env.DATABASE_URL } : {}),
		log:
			env.NODE_ENV === 'development' || Number(env.LOG_SLOW_QUERIES_MS ?? '0') > 0
				? ['query', 'error', 'warn']
				: ['error']
	});

	const slowQueryMs = Number(env.LOG_SLOW_QUERIES_MS ?? '0');
	if (slowQueryMs > 0 && !globalForPrisma.prismaSlowQueryHooked) {
		client.$on('query', (event) => {
			if (event.duration >= slowQueryMs) {
				console.warn(`[slow-query] ${event.duration}ms ${event.query}`);
			}
		});
		globalForPrisma.prismaSlowQueryHooked = true;
	}

	return client;
}

function getPrismaClient(): PrismaClient {
	if (!globalForPrisma.prisma) {
		globalForPrisma.prisma = createPrismaClient();
	}

	return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();
