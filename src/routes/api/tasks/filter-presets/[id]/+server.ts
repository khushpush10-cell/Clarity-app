import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { taskFilterPresetUtils } from '$lib/server/task/filterPresets';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

function resolveWorkspaceId(allowed: string[], requested?: string) {
	if (requested && allowed.includes(requested)) return requested;
	return allowed[0];
}

export const DELETE: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = resolveWorkspaceId(workspaceIds, url.searchParams.get('workspaceId') ?? undefined);
	if (!workspaceId) {
		return json({ error: 'No workspace available' }, { status: 400 });
	}

	const workspace = await prisma.workspace.findFirst({
		where: { id: workspaceId, deletedAt: null },
		select: { settings: true }
	});

	if (!workspace) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	const all = taskFilterPresetUtils.parsePresets(workspace.settings);
	const target = all.find((item) => item.id === params.id);
	if (!target || target.userId !== locals.user.id) {
		return json({ error: 'Preset not found' }, { status: 404 });
	}

	const next = all.filter((item) => item.id !== params.id);
	await prisma.workspace.update({
		where: { id: workspaceId },
		data: {
			settings: taskFilterPresetUtils.withPresets(workspace.settings, next)
		}
	});

	return json({ success: true, id: params.id, workspaceId });
};
