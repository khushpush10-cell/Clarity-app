import { error, redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

import { env } from '$lib/server/env';
import { issueSession } from '$lib/server/auth/service';
import { prisma } from '$lib/server/prisma';
import { ensurePersonalWorkspace } from '$lib/server/workspace';
import { resolveAppBaseUrl } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals, url, cookies, request }) => {
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get('google_oauth_state');
	cookies.delete('google_oauth_state', { path: '/' });

	if (!code || !state || !expectedState || state !== expectedState) {
		throw error(400, 'Invalid OAuth response.');
	}

	const { OAuth2Client } = await import('google-auth-library');
	const baseUrl = resolveAppBaseUrl(url.origin);
	const redirectUri = `${baseUrl}/auth/callback`;
	const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);

	const { tokens } = await client.getToken(code);
	if (!tokens.id_token) {
		throw error(400, 'Google sign-in failed.');
	}

	const ticket = await client.verifyIdToken({
		idToken: tokens.id_token,
		audience: env.GOOGLE_CLIENT_ID
	});
	const payload = ticket.getPayload();
	if (!payload?.sub || !payload.email) {
		throw error(400, 'Google sign-in failed.');
	}

	const existingByGoogle = await prisma.user.findUnique({ where: { googleId: payload.sub } });
	let user = existingByGoogle;

	if (!user) {
		const existingByEmail = await prisma.user.findUnique({ where: { email: payload.email } });
		if (existingByEmail) {
			user = await prisma.user.update({
				where: { id: existingByEmail.id },
				data: {
					googleId: payload.sub,
					emailVerified: true,
					avatarUrl: payload.picture ?? existingByEmail.avatarUrl
				}
			});
		} else {
			user = await prisma.user.create({
				data: {
					email: payload.email,
					name: payload.name ?? payload.email.split('@')[0] ?? 'Clarity User',
					googleId: payload.sub,
					emailVerified: true,
					avatarUrl: payload.picture ?? null,
					progressCore: {
						create: {}
					}
				}
			});
		}
	}

	await ensurePersonalWorkspace(user.id);
	await issueSession({ locals, url, cookies, request } as unknown as Parameters<typeof issueSession>[0], {
		id: user.id,
		email: user.email,
		name: user.name
	});

	throw redirect(302, '/dashboard');
};
