import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { ACCESS_COOKIE, REFRESH_COOKIE } from '$lib/server/auth/constants';
import { prisma } from '$lib/server/prisma';

export const DELETE: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const currentRefresh = cookies.get(REFRESH_COOKIE);

	const sessions = await prisma.userSession.findMany({
		where: { userId: locals.user.id },
		select: { id: true, refreshToken: true }
	});

	const toDelete = sessions
		.filter((session) => session.refreshToken !== currentRefresh)
		.map((session) => session.id);

	if (toDelete.length > 0) {
		await prisma.userSession.deleteMany({ where: { id: { in: toDelete } } });
	}

	cookies.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
	return json({ success: true, removed: toDelete.length });
};
