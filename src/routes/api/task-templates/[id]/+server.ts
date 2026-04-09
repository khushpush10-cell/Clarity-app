import { Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

function parseTemplates(settings: unknown): Array<Record<string, unknown>> {
	if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return [];
	const data = settings as { templates?: unknown };
	return Array.isArray(data.templates) ? (data.templates as Array<Record<string, unknown>>) : [];
}

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = workspaceIds[0];
	if (!workspaceId) return json({ error: 'No workspace available' }, { status: 400 });

	const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
	if (!workspace) return json({ error: 'Workspace not found' }, { status: 404 });

	const templates = parseTemplates(workspace.settings);
	const next = templates.filter((template) => template.id !== params.id);

	const nextSettings = {
		...((workspace.settings as Record<string, unknown> | null) ?? {}),
		templates: next
	};

	await prisma.workspace.update({
		where: { id: workspaceId },
		data: {
			settings: nextSettings as Prisma.InputJsonValue
		}
	});

	return json({ success: true });
};
