import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { forgotPasswordSchema } from '$lib/server/auth/schemas';
import { createRandomToken, hashToken } from '$lib/server/auth/tokens';
import { resolveAppBaseUrl, sendEmail } from '$lib/server/email';
import { env } from '$lib/server/env';
import { prisma } from '$lib/server/prisma';
import { checkRateLimit } from '$lib/server/security/rateLimit';

export const POST: RequestHandler = async (event) => {
	const ip = event.getClientAddress?.() ?? 'unknown';
	if (!checkRateLimit(`forgot:${ip}`, 10, 60 * 60 * 1000)) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	const emailConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
	if (!emailConfigured) {
		return json(
			{
				error:
					'Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM to enable password resets.'
			},
			{ status: 500 }
		);
	}

	try {
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

		const baseUrl = resolveAppBaseUrl(event.url.origin);
		const resetUrl = `${baseUrl}/auth/reset?token=${token}`;
		await sendEmail({
			to: user.email,
			subject: 'Reset your Clarity password',
			text: `Reset your password: ${resetUrl}`,
			html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
		});

		return json({ success: true });
	} catch (error) {
		if (error instanceof Error && error.message.includes('RESEND_API_KEY')) {
			return json({ error: 'Email service not configured' }, { status: 500 });
		}
		if (error instanceof Error && error.message.includes('EMAIL_FROM')) {
			return json({ error: 'Email sender not configured' }, { status: 500 });
		}

		return json({ error: 'Unable to send reset email' }, { status: 500 });
	}
};
