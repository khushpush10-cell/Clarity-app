import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { verifyEmailSchema } from '$lib/server/auth/schemas';
import { hashToken } from '$lib/server/auth/tokens';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async (event) => {
	const payload = verifyEmailSchema.safeParse(await event.request.json());
	if (!payload.success) {
		return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
	}

	const tokenHash = hashToken(payload.data.token);
	const token = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

	if (!token || token.usedAt || token.expiresAt < new Date()) {
		return json({ error: 'Invalid or expired token' }, { status: 400 });
	}

	await prisma.$transaction([
		prisma.user.update({
			where: { id: token.userId },
			data: { emailVerified: true }
		}),
		prisma.emailVerificationToken.update({
			where: { id: token.id },
			data: { usedAt: new Date() }
		})
	]);

	return json({ success: true });
};
