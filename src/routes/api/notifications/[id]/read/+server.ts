import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const item = await prisma.notification.findFirst({
		where: {
			id: params.id,
			userId: locals.user.id
		},
		select: { id: true }
	});

	if (!item) {
		return json({ error: 'Notification not found' }, { status: 404 });
	}

	await prisma.notification.update({ where: { id: params.id }, data: { read: true } });
	return json({ success: true });
};
