import { randomUUID } from 'node:crypto';

import { Prisma, TaskPriority } from '@prisma/client';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

const templateSchema = z.object({
	name: z.string().min(1).max(191),
	title: z.string().min(1).max(255),
	description: z.string().max(5000).optional().nullable(),
	priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM)
});

function parseTemplates(settings: unknown): Array<Record<string, unknown>> {
	if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return [];
	const data = settings as { templates?: unknown };
	return Array.isArray(data.templates) ? (data.templates as Array<Record<string, unknown>>) : [];
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const requestedWorkspace = url.searchParams.get('workspaceId');
	const workspaceId =
		requestedWorkspace && workspaceIds.includes(requestedWorkspace)
			? requestedWorkspace
			: workspaceIds[0];
	if (!workspaceId) return json({ items: [] });

	const workspace = await prisma.workspace.findFirst({
		where: { id: workspaceId, deletedAt: null },
		select: { settings: true }
	});
	if (!workspace) return json({ items: [] });

	const items = parseTemplates(workspace.settings);
	return json({ items, workspaceId });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const parsed = templateSchema.safeParse(await request.json());
	if (!parsed.success) return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = workspaceIds[0];
	if (!workspaceId) return json({ error: 'No workspace available' }, { status: 400 });

	const workspace = await prisma.workspace.findUnique({
		where: { id: workspaceId },
		select: { settings: true }
	});
	if (!workspace) return json({ error: 'Workspace not found' }, { status: 404 });

	const templates = parseTemplates(workspace.settings);
	const item = {
		id: randomUUID(),
		name: parsed.data.name,
		title: parsed.data.title,
		description: parsed.data.description ?? null,
		priority: parsed.data.priority,
		createdAt: new Date().toISOString()
	};

	const nextSettings = {
		...((workspace.settings as Record<string, unknown> | null) ?? {}),
		templates: [item, ...templates]
	};

	await prisma.workspace.update({
		where: { id: workspaceId },
		data: {
			settings: nextSettings as Prisma.InputJsonValue
		}
	});

	return json({ item }, { status: 201 });
};
