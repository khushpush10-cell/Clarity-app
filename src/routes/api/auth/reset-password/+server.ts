import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { hashPassword } from '$lib/server/auth/password';
import { resetPasswordSchema } from '$lib/server/auth/schemas';
import { hashToken } from '$lib/server/auth/tokens';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async (event) => {
	const payload = resetPasswordSchema.safeParse(await event.request.json());
	if (!payload.success) {
		return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
	}

	const tokenHash = hashToken(payload.data.token);
	const token = await prisma.passwordResetToken.findUnique({
		where: { tokenHash }
	});

	if (!token || token.usedAt || token.expiresAt < new Date()) {
		return json({ error: 'Invalid or expired token' }, { status: 400 });
	}

	const passwordHash = await hashPassword(payload.data.password);

	await prisma.$transaction([
		prisma.user.update({
			where: { id: token.userId },
			data: { passwordHash }
		}),
		prisma.passwordResetToken.update({
			where: { id: token.id },
			data: { usedAt: new Date() }
		}),
		prisma.userSession.deleteMany({ where: { userId: token.userId } })
	]);

	return json({ success: true });
};
