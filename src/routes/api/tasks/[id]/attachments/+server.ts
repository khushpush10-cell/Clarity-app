import { z } from 'zod';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

const attachmentSchema = z.object({
	name: z.string().min(1).max(255),
	url: z.string().url(),
	mimeType: z.string().min(1).max(128).optional(),
	size: z.number().int().positive().optional()
});

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const items = await prisma.taskAttachment.findMany({
		where: { taskId: params.id },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			name: true,
			url: true,
			mimeType: true,
			size: true,
			createdAt: true,
			uploader: { select: { name: true, email: true } }
		}
	});

	return json({ items });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = attachmentSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const task = await prisma.task.findFirst({
		where: { id: params.id, deletedAt: null },
		select: { id: true }
	});
	if (!task) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	const item = await prisma.taskAttachment.create({
		data: {
			taskId: params.id,
			uploaderId: locals.user.id,
			name: parsed.data.name,
			url: parsed.data.url,
			mimeType: parsed.data.mimeType ?? null,
			size: parsed.data.size ?? null
		},
		select: {
			id: true,
			name: true,
			url: true,
			mimeType: true,
			size: true,
			createdAt: true
		}
	});

	return json({ item }, { status: 201 });
};
