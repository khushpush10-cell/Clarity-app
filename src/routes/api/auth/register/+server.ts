import { Prisma, WorkspaceRole, WorkspaceType } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { hashPassword } from '$lib/server/auth/password';
import { registerSchema } from '$lib/server/auth/schemas';
import { issueSession } from '$lib/server/auth/service';
import { createRandomToken, hashToken } from '$lib/server/auth/tokens';
import { prisma } from '$lib/server/prisma';
import { checkRateLimit } from '$lib/server/security/rateLimit';

function isPrismaConnectionError(error: unknown): boolean {
	return (
		error instanceof Prisma.PrismaClientInitializationError ||
		error instanceof Prisma.PrismaClientRustPanicError
	);
}

export const POST: RequestHandler = async (event) => {
	const ip = event.getClientAddress?.() ?? 'unknown';
	if (!checkRateLimit(`register:${ip}`, 20, 60 * 1000)) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	try {
		const payload = registerSchema.safeParse(await event.request.json());
		if (!payload.success) {
			return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
		}

		const existing = await prisma.user.findUnique({ where: { email: payload.data.email } });
		if (existing) {
			return json({ error: 'Email is already in use' }, { status: 409 });
		}

		const passwordHash = await hashPassword(payload.data.password);

		const user = await prisma.$transaction(async (tx) => {
			const createdUser = await tx.user.create({
				data: {
					email: payload.data.email,
					passwordHash,
					name: payload.data.name,
					progressCore: {
						create: {}
					}
				},
				select: {
					id: true,
					email: true,
					name: true
				}
			});

			const workspace = await tx.workspace.create({
				data: {
					name: 'Personal Workspace',
					type: WorkspaceType.PERSONAL,
					ownerId: createdUser.id
				},
				select: { id: true }
			});

			await tx.workspaceMember.create({
				data: {
					workspaceId: workspace.id,
					userId: createdUser.id,
					role: WorkspaceRole.OWNER
				}
			});

			return createdUser;
		});

		const verificationToken = createRandomToken();
		await prisma.emailVerificationToken.create({
			data: {
				userId: user.id,
				tokenHash: hashToken(verificationToken),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
			}
		});

		await issueSession(event, user);

		return json(
			{
				user,
				verificationToken
			},
			{ status: 201 }
		);
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

		return json({ error: 'Registration failed due to a server error' }, { status: 500 });
	}
};
