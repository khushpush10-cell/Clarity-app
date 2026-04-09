import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { twoFactorDisableSchema } from '$lib/server/auth/schemas';
import { verifyTotp } from '$lib/server/auth/service';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const payload = twoFactorDisableSchema.safeParse(await event.request.json());
	if (!payload.success) {
		return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
	}

	const user = await prisma.user.findUnique({ where: { id: event.locals.user.id } });
	if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
		return json({ error: 'Two-factor is not enabled' }, { status: 400 });
	}

	const valid = verifyTotp(user.twoFactorSecret, payload.data.code);
	if (!valid) {
		return json({ error: 'Invalid authenticator code' }, { status: 400 });
	}

	await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: {
				twoFactorEnabled: false,
				twoFactorSecret: null
			}
		}),
		prisma.twoFactorBackupCode.deleteMany({ where: { userId: user.id } })
	]);

	return json({ success: true });
};
