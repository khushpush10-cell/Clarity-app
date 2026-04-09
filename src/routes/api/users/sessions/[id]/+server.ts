import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await prisma.userSession.deleteMany({
		where: {
			id: params.id,
			userId: locals.user.id
		}
	});

	return json({ success: true });
};
