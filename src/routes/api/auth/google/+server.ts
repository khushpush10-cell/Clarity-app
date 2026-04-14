import { OAuth2Client } from 'google-auth-library';
import { Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { issueSession } from '$lib/server/auth/service';
import { googleAuthSchema } from '$lib/server/auth/schemas';
import { env } from '$lib/server/env';
import { prisma } from '$lib/server/prisma';

function isPrismaConnectionError(error: unknown): boolean {
	return (
		error instanceof Prisma.PrismaClientInitializationError ||
		error instanceof Prisma.PrismaClientRustPanicError
	);
}

export const POST: RequestHandler = async (event) => {
	try {
		if (!env.GOOGLE_CLIENT_ID) {
			return json({ error: 'Google OAuth is not configured' }, { status: 503 });
		}

		const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

		const payload = googleAuthSchema.safeParse(await event.request.json());
		if (!payload.success) {
			return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
		}

		const ticket = await client.verifyIdToken({
			idToken: payload.data.idToken,
			audience: env.GOOGLE_CLIENT_ID
		});

		const data = ticket.getPayload();
		if (!data?.sub || !data.email) {
			return json({ error: 'Invalid Google token' }, { status: 401 });
		}

		const email = data.email.toLowerCase();

		const user = await prisma.user.upsert({
			where: { email },
			update: {
				googleId: data.sub,
				name: data.name ?? email,
				avatarUrl: data.picture ?? null,
				emailVerified: true,
				lastLogin: new Date()
			},
			create: {
				email,
				googleId: data.sub,
				name: data.name ?? email,
				avatarUrl: data.picture ?? null,
				emailVerified: true,
				lastLogin: new Date(),
				progressCore: { create: {} }
			},
			select: {
				id: true,
				email: true,
				name: true
			}
		});

		await issueSession(event, user);

		return json({ user });
	} catch (error) {
		if (isPrismaConnectionError(error)) {
			return json(
				{
					error:
						'Database is not connected. Set DATABASE_URL correctly and run: npx prisma db push'
				},
				{ status: 503 }
			);
		}

		return json({ error: 'Google sign-in failed' }, { status: 500 });
	}
};
