import { json } from '@sveltejs/kit';
import { z } from 'zod';

import type { RequestHandler } from './$types';

import { clearAuthCookies } from '$lib/server/auth/cookies';
import { prisma } from '$lib/server/prisma';

const updateMeSchema = z.object({
	name: z.string().min(1).max(120).optional(),
	avatarUrl: z.string().url().nullable().optional()
});

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	return json({ user: locals.user });
};

export const PUT: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const payload = updateMeSchema.safeParse(await event.request.json());
	if (!payload.success) {
		return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
	}

	const data: { name?: string; avatarUrl?: string | null } = {};
	if (typeof payload.data.name !== 'undefined') {
		data.name = payload.data.name;
	}

	if (typeof payload.data.avatarUrl !== 'undefined') {
		data.avatarUrl = payload.data.avatarUrl;
	}

	const user = await prisma.user.update({
		where: { id: event.locals.user.id },
		data,
		select: {
			id: true,
			email: true,
			name: true,
			avatarUrl: true
		}
	});

	return json({ user });
};

export const DELETE: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await prisma.user.update({
		where: { id: event.locals.user.id },
		data: { deletedAt: new Date() }
	});

	await prisma.userSession.deleteMany({ where: { userId: event.locals.user.id } });
	clearAuthCookies(event.cookies);

	return json({ success: true });
};
