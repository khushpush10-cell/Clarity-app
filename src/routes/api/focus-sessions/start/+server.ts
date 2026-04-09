import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { focusStartSchema } from '$lib/server/focus/schemas';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = focusStartSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId =
		parsed.data.workspaceId && workspaceIds.includes(parsed.data.workspaceId)
			? parsed.data.workspaceId
			: workspaceIds[0];

	if (!workspaceId) {
		return json({ error: 'No workspace available' }, { status: 400 });
	}

	if (parsed.data.taskId) {
		const task = await prisma.task.findFirst({
			where: {
				id: parsed.data.taskId,
				workspaceId,
				deletedAt: null
			},
			select: { id: true }
		});

		if (!task) {
			return json({ error: 'Task not found in workspace' }, { status: 404 });
		}
	}

	const item = await prisma.focusSession.create({
		data: {
			userId: locals.user.id,
			workspaceId,
			taskId: parsed.data.taskId ?? null,
			durationMinutes: parsed.data.durationMinutes,
			startedAt: new Date(),
			notes: parsed.data.notes ?? null
		}
	});

	return json({ item }, { status: 201 });
};
