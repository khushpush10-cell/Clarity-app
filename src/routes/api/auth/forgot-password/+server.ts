import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { forgotPasswordSchema } from '$lib/server/auth/schemas';
import { createRandomToken, hashToken } from '$lib/server/auth/tokens';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async (event) => {
	const payload = forgotPasswordSchema.safeParse(await event.request.json());
	if (!payload.success) {
		return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
	}

	const user = await prisma.user.findUnique({ where: { email: payload.data.email } });
	if (!user || user.deletedAt) {
		return json({ success: true });
	}

	const token = createRandomToken();
	await prisma.passwordResetToken.create({
		data: {
			userId: user.id,
			tokenHash: hashToken(token),
			expiresAt: new Date(Date.now() + 60 * 60 * 1000)
		}
	});

	return json({ success: true, resetToken: token });
};
