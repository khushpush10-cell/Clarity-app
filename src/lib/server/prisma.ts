import { PrismaClient } from '@prisma/client';

import { env } from '$lib/server/env';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
	prismaSlowQueryHooked: boolean | undefined;
};

function createPrismaClient(): PrismaClient {
	const client = new PrismaClient({
		datasourceUrl: env.DATABASE_URL,
		log:
			env.NODE_ENV === 'development' || Number(env.LOG_SLOW_QUERIES_MS ?? '0') > 0
				? ['query', 'error', 'warn']
				: ['error']
	});

	const slowQueryMs = Number(env.LOG_SLOW_QUERIES_MS ?? '0');
	if (slowQueryMs > 0 && !globalForPrisma.prismaSlowQueryHooked) {
		const onQuery = client.$on as unknown as (event: string, cb: (e: any) => void) => void;
		onQuery('query', (event) => {
			if (event.duration >= slowQueryMs) {
				console.warn(`[slow-query] ${event.model}.${event.action} ${event.duration}ms`);
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

export const prisma = new Proxy({} as PrismaClient, {
	get(_target, prop, receiver) {
		const client = getPrismaClient() as unknown as Record<string | symbol, unknown>;
		const value = Reflect.get(client, prop, receiver);
		if (typeof value === 'function') {
			return (value as (...args: unknown[]) => unknown).bind(client);
		}

		return value;
	}
});
