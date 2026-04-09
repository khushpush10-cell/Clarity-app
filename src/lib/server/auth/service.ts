import speakeasy from 'speakeasy';

import type { RequestEvent } from '@sveltejs/kit';

import { prisma } from '$lib/server/prisma';
import { REFRESH_COOKIE, REFRESH_TOKEN_TTL_SECONDS } from '$lib/server/auth/constants';
import { clearAuthCookies, setAuthCookies } from '$lib/server/auth/cookies';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '$lib/server/auth/jwt';
import { hashToken } from '$lib/server/auth/tokens';

function getClientIp(event: RequestEvent): string | null {
	const xff = event.request.headers.get('x-forwarded-for');
	if (xff) {
		return xff.split(',')[0]?.trim() ?? null;
	}
	return event.getClientAddress?.() ?? null;
}

export async function issueSession(
	event: RequestEvent,
	user: { id: string; email: string; name: string }
) {
	const accessToken = await signAccessToken({ sub: user.id, email: user.email, name: user.name });
	const refreshToken = await signRefreshToken({ sub: user.id, email: user.email, name: user.name });

	await prisma.userSession.create({
		data: {
			userId: user.id,
			refreshToken: hashToken(refreshToken),
			userAgent: event.request.headers.get('user-agent'),
			ipAddress: getClientIp(event),
			expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
		}
	});

	setAuthCookies(event.cookies, accessToken, refreshToken);
}

export async function rotateSession(
	event: RequestEvent
): Promise<{ id: string; email: string; name: string } | null> {
	const refreshToken = event.cookies.get(REFRESH_COOKIE);
	if (!refreshToken) {
		return null;
	}

	const payload = await verifyRefreshToken(refreshToken);
	if (!payload?.sub) {
		return null;
	}

	const tokenHash = hashToken(refreshToken);

	const session = await prisma.userSession.findUnique({
		where: { refreshToken: tokenHash },
		include: { user: true }
	});

	if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
		return null;
	}

	await prisma.userSession.delete({ where: { id: session.id } });

	const user = {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name
	};

	await issueSession(event, user);

	return user;
}

export async function revokeCurrentSession(event: RequestEvent): Promise<void> {
	const refreshToken = event.cookies.get(REFRESH_COOKIE);
	if (refreshToken) {
		await prisma.userSession.deleteMany({ where: { refreshToken: hashToken(refreshToken) } });
	}

	clearAuthCookies(event.cookies);
}

export function verifyTotp(secret: string, code: string): boolean {
	return speakeasy.totp.verify({
		secret,
		token: code,
		encoding: 'base32',
		window: 1
	});
}

export function createTotpSecret(email: string): { secret: string; otpauthUrl: string } {
	const secret = speakeasy.generateSecret({
		name: `Clarity (${email})`,
		issuer: 'Clarity'
	});

	return {
		secret: secret.base32,
		otpauthUrl: secret.otpauth_url ?? ''
	};
}
