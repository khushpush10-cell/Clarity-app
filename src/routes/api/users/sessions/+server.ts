import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const sessions = await prisma.userSession.findMany({
		where: {
			userId: locals.user.id,
			expiresAt: { gt: new Date() }
		},
		select: {
			id: true,
			userAgent: true,
			ipAddress: true,
			lastSeenAt: true,
			createdAt: true,
			expiresAt: true
		},
		orderBy: { lastSeenAt: 'desc' }
	});

	return json({ sessions });
};
