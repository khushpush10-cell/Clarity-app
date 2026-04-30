import { randomUUID } from 'node:crypto';

import { env } from '$env/dynamic/private';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';

import { captureError, initServerObservability } from '$lib/server/observability';
import { prisma } from '$lib/server/prisma';
import { ensurePersonalWorkspace } from '$lib/server/workspace';

const guestCookieName = 'clarity_guest_id';

const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"img-src 'self' data: https:",
	"font-src 'self' data: https://fonts.gstatic.com",
	"connect-src 'self'",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'"
].join('; ');

function isStateChanging(method: string) {
	return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function getOrCreateGuestId(event: Parameters<Handle>[0]['event']) {
	const existing = event.cookies.get(guestCookieName);
	if (existing && /^[a-f0-9-]{36}$/i.test(existing)) {
		return existing;
	}

	const guestId = randomUUID();
	event.cookies.set(guestCookieName, guestId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 365
	});
	return guestId;
}

async function ensureBypassUser(guestId: string) {
	const email = `guest-${guestId}@clarity.local`;
	const user = await prisma.user.upsert({
		where: { email },
		update: {
			name: 'Guest',
			emailVerified: true,
			deletedAt: null
		},
		create: {
			email,
			name: 'Guest',
			emailVerified: true,
			passwordHash: null,
			progressCore: {
				create: {}
			}
		},
		select: {
			id: true,
			email: true,
			name: true,
			avatarUrl: true
		}
	});

	await ensurePersonalWorkspace(user.id);
	return user;
}

export const handle: Handle = async ({ event, resolve }) => {
	initServerObservability();
	event.locals.requestId = randomUUID();
	event.locals.user = null;
	const isHealthRoute = event.url.pathname.startsWith('/api/health');
	const maintenance = env.MAINTENANCE_MODE === '1';

	if (maintenance && event.url.pathname !== '/maintenance' && !event.url.pathname.startsWith('/api/health')) {
		throw redirect(302, '/maintenance');
	}
	if (!maintenance && event.url.pathname === '/maintenance' && !event.url.pathname.startsWith('/api')) {
		throw redirect(302, '/dashboard');
	}

	if (event.url.pathname.startsWith('/api') && isStateChanging(event.request.method)) {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');
		const expectedOrigin = `${event.url.protocol}//${host}`;
		if (origin && origin !== expectedOrigin) {
			return new Response(JSON.stringify({ error: 'Invalid request origin' }), {
				status: 403,
				headers: { 'content-type': 'application/json' }
			});
		}
	}

	try {
		const user = await ensureBypassUser(getOrCreateGuestId(event));
		event.locals.user = {
			id: user.id,
			email: user.email,
			name: user.name,
			avatarUrl: user.avatarUrl
		};
	} catch {
		if (isHealthRoute) {
			event.locals.user = {
				id: 'health-check-user',
				email: 'health@clarity.local',
				name: 'Health Check',
				avatarUrl: null
			};
		} else if (event.url.pathname.startsWith('/api')) {
			return new Response(JSON.stringify({ error: 'Database unavailable' }), {
				status: 503,
				headers: { 'content-type': 'application/json' }
			});
		} else {
			event.locals.user = {
				id: 'guest-fallback-user',
				email: 'guest@clarity.local',
				name: 'Guest',
				avatarUrl: null
			};
		}
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-type' || name === 'cache-control'
	});

	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('content-security-policy', csp);

	if (env.NODE_ENV === 'production' && env.VERCEL_URL) {
		response.headers.set('access-control-allow-origin', `https://${env.VERCEL_URL}`);
	} else {
		response.headers.set('access-control-allow-origin', event.url.origin);
	}
	response.headers.set('access-control-allow-credentials', 'true');

	return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
	captureError(error, { requestId: event.locals.requestId, path: event.url.pathname });
};
