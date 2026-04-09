import { Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { canManageWorkspace, getWorkspaceMembership } from '$lib/server/workspace';
import { workspaceUpdateSchema } from '$lib/server/workspace/schemas';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const membership = await getWorkspaceMembership(locals.user.id, params.id);
	if (!membership) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	const item = await prisma.workspace.findFirst({
		where: {
			id: params.id,
			deletedAt: null
		}
	});

	if (!item) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	return json({ item, role: membership.role });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const membership = await getWorkspaceMembership(locals.user.id, params.id);
	if (!membership) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	if (!canManageWorkspace(membership.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const parsed = workspaceUpdateSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const item = await prisma.workspace.update({
		where: { id: params.id },
		data: {
			...(typeof parsed.data.name !== 'undefined' ? { name: parsed.data.name } : {}),
			...(typeof parsed.data.type !== 'undefined' ? { type: parsed.data.type } : {}),
			...(typeof parsed.data.settings !== 'undefined'
				? { settings: parsed.data.settings as Prisma.InputJsonValue }
				: {})
		}
	});

	return json({ item });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const membership = await getWorkspaceMembership(locals.user.id, params.id);
	if (!membership) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	if (!canManageWorkspace(membership.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await prisma.workspace.update({
		where: { id: params.id },
		data: {
			deletedAt: new Date()
		}
	});

	return json({ success: true });
};
