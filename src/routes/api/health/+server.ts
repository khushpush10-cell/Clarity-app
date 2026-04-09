import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	let database = 'ok';
	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch {
		database = 'unreachable';
	}

	return json({
		ok: true,
		database,
		requestId: locals.requestId,
		service: 'clarity-api'
	});
};
