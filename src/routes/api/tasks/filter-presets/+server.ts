import { randomUUID } from 'node:crypto';

import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { filterPresetSchema, taskFilterPresetUtils, type StoredTaskFilterPreset } from '$lib/server/task/filterPresets';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

function resolveWorkspaceId(allowed: string[], requested?: string) {
	if (requested && allowed.includes(requested)) return requested;
	return allowed[0];
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = resolveWorkspaceId(workspaceIds, url.searchParams.get('workspaceId') ?? undefined);
	if (!workspaceId) {
		return json({ items: [] });
	}

	const workspace = await prisma.workspace.findFirst({
		where: { id: workspaceId, deletedAt: null },
		select: { settings: true }
	});

	if (!workspace) {
		return json({ items: [] });
	}

	const all = taskFilterPresetUtils.parsePresets(workspace.settings);
	const items = all.filter((item) => item.userId === locals.user!.id);
	return json({ items, workspaceId });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = filterPresetSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = resolveWorkspaceId(workspaceIds, parsed.data.workspaceId);
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

	const existing = taskFilterPresetUtils.parsePresets(workspace.settings);
	const next: StoredTaskFilterPreset = {
		id: randomUUID(),
		userId: locals.user.id,
		name: parsed.data.name,
		search: parsed.data.search,
		statusFilter: parsed.data.statusFilter,
		priorityFilter: parsed.data.priorityFilter,
		createdAt: new Date().toISOString()
	};

	const merged = [next, ...existing];

	await prisma.workspace.update({
		where: { id: workspaceId },
		data: {
			settings: taskFilterPresetUtils.withPresets(workspace.settings, merged)
		}
	});

	return json({ item: next, workspaceId }, { status: 201 });
};
