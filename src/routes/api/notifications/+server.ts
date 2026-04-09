import { json } from '@sveltejs/kit';
import { z } from 'zod';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

const createNotificationSchema = z.object({
	type: z.string().min(1).max(64),
	title: z.string().min(1).max(191),
	message: z.string().min(1).max(5000),
	link: z.string().max(500).optional().nullable()
});

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const unreadOnly = url.searchParams.get('unread') === '1';

	const items = await prisma.notification.findMany({
		where: {
			userId: locals.user.id,
			...(unreadOnly ? { read: false } : {})
		},
		orderBy: { createdAt: 'desc' },
		take: 50
	});

	const unread = await prisma.notification.count({
		where: { userId: locals.user.id, read: false }
	});

	return json({ items, unread });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = createNotificationSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const item = await prisma.notification.create({
		data: {
			userId: locals.user.id,
			type: parsed.data.type,
			title: parsed.data.title,
			message: parsed.data.message,
			link: parsed.data.link ?? null
		}
	});

	return json({ item }, { status: 201 });
};
