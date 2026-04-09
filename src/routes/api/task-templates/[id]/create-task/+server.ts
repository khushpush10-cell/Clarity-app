import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

function parseTemplates(settings: unknown): Array<Record<string, unknown>> {
	if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return [];
	const data = settings as { templates?: unknown };
	return Array.isArray(data.templates) ? (data.templates as Array<Record<string, unknown>>) : [];
}

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = workspaceIds[0];
	if (!workspaceId) return json({ error: 'No workspace available' }, { status: 400 });

	const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
	if (!workspace) return json({ error: 'Workspace not found' }, { status: 404 });

	const templates = parseTemplates(workspace.settings);
	const template = templates.find((entry) => entry.id === params.id);
	if (!template) return json({ error: 'Template not found' }, { status: 404 });

	const maxPositionTask = await prisma.task.findFirst({ where: { workspaceId, deletedAt: null }, orderBy: { position: 'desc' }, select: { position: true } });

	const item = await prisma.task.create({
		data: {
			workspaceId,
			creatorId: locals.user.id,
			title: String(template.title ?? 'Template Task'),
			description: (template.description as string | null | undefined) ?? null,
			priority: (template.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | undefined) ?? 'MEDIUM',
			position: (maxPositionTask?.position ?? 0) + 1
		}
	});

	return json({ item }, { status: 201 });
};
