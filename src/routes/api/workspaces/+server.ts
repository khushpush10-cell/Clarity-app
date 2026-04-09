import { Prisma, WorkspaceRole } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaces } from '$lib/server/workspace';
import { workspaceCreateSchema } from '$lib/server/workspace/schemas';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const items = await getAccessibleWorkspaces(locals.user.id);
	return json({ items });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = workspaceCreateSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const item = await prisma.workspace.create({
		data: {
			name: parsed.data.name,
			type: parsed.data.type,
			ownerId: locals.user.id,
			...(typeof parsed.data.settings !== 'undefined'
				? { settings: parsed.data.settings as Prisma.InputJsonValue }
				: {}),
			members: {
				create: {
					userId: locals.user.id,
					role: WorkspaceRole.OWNER
				}
			}
		}
	});

	return json({ item }, { status: 201 });
};
