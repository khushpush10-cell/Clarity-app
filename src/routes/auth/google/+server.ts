import { error, redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { env } from '$lib/server/env';
import { resolveAppBaseUrl } from '$lib/server/email';

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
		throw error(503, 'Google OAuth is not configured.');
	}

	const state = crypto.randomUUID();
	cookies.set('google_oauth_state', state, {
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		path: '/',
		maxAge: 10 * 60
	});

	const { OAuth2Client } = await import('google-auth-library');
	const baseUrl = resolveAppBaseUrl(url.origin);
	const redirectUri = `${baseUrl}/auth/callback`;
	const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);

	const authUrl = client.generateAuthUrl({
		access_type: 'offline',
		prompt: 'consent',
		scope: ['profile', 'email'],
		state
	});

	throw redirect(302, authUrl);
};
