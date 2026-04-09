import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = url.searchParams.get('workspaceId');
	const selectedWorkspaceId =
		workspaceId && workspaceIds.includes(workspaceId) ? workspaceId : workspaceIds[0];

	const items = await prisma.focusSession.findMany({
		where: {
			userId: locals.user.id,
			...(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {})
		},
		orderBy: { startedAt: 'desc' },
		take: 100
	});

	return json({ items });
};
