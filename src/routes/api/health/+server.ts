import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	let database = 'ok';
	let databaseErrorCode: string | null = null;
	let databaseError: string | null = null;

	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch (error) {
		database = 'unreachable';
		const err = error as { code?: string; message?: string };
		databaseErrorCode = err.code ?? null;
		databaseError = err.message ?? 'Unknown database error';
	}

	return json({
		ok: true,
		database,
		databaseErrorCode,
		databaseError,
		requestId: locals.requestId,
		service: 'clarity-api'
	});
};
