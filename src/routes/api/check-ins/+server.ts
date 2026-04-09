import { json } from '@sveltejs/kit';
import { z } from 'zod';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

const checkInSchema = z.object({
	mood: z.number().int().min(1).max(5),
	energy: z.number().int().min(1).max(5),
	reflection: z.string().max(2000).optional().nullable()
});

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const items = await prisma.auditLog.findMany({
		where: {
			userId: locals.user.id,
			entityType: 'DAILY_CHECKIN'
		},
		orderBy: { createdAt: 'desc' },
		take: 30,
		select: {
			id: true,
			createdAt: true,
			changes: true
		}
	});

	return json({ items });
};

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const parsed = checkInSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = workspaceIds[0];
	if (!workspaceId) return json({ error: 'No workspace available' }, { status: 400 });

	const item = await prisma.auditLog.create({
		data: {
			workspaceId,
			userId: locals.user.id,
			action: 'CHECK_IN',
			entityType: 'DAILY_CHECKIN',
			entityId: `${locals.user.id}:${new Date().toISOString().slice(0, 10)}`,
			changes: {
				mood: parsed.data.mood,
				energy: parsed.data.energy,
				reflection: parsed.data.reflection ?? null
			},
			ipAddress: getClientAddress?.() ?? null,
			userAgent: request.headers.get('user-agent')
		}
	});

	return json({ item }, { status: 201 });
};
