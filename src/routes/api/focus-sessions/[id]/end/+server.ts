import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { focusEndSchema } from '$lib/server/focus/schemas';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = focusEndSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);

	const existing = await prisma.focusSession.findFirst({
		where: {
			id: params.id,
			userId: locals.user.id,
			workspaceId: { in: workspaceIds }
		}
	});

	if (!existing) {
		return json({ error: 'Focus session not found' }, { status: 404 });
	}

	const item = await prisma.focusSession.update({
		where: { id: params.id },
		data: {
			completedAt: new Date(),
			interruptions: parsed.data.interruptions,
			notes: parsed.data.notes ?? existing.notes
		}
	});

	return json({ item });
};
