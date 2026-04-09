import { Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { loginSchema } from '$lib/server/auth/schemas';
import { issueSession, verifyTotp } from '$lib/server/auth/service';
import { verifyPassword } from '$lib/server/auth/password';
import { hashToken } from '$lib/server/auth/tokens';
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
	if (!checkRateLimit(`login:${ip}`, 5, 60 * 60 * 1000)) {
		return json({ error: 'Too many login attempts' }, { status: 429 });
	}

	try {
		const payload = loginSchema.safeParse(await event.request.json());
		if (!payload.success) {
			return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
		}

		const user = await prisma.user.findUnique({
			where: { email: payload.data.email },
			include: {
				backupCodes: {
					where: { usedAt: null }
				}
			}
		});

		if (!user || !user.passwordHash || user.deletedAt) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		const validPassword = await verifyPassword(payload.data.password, user.passwordHash);
		if (!validPassword) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		if (user.twoFactorEnabled) {
			const code = payload.data.totpCode;
			const backupCode = payload.data.backupCode;

			let passed = false;

			if (code && user.twoFactorSecret) {
				passed = verifyTotp(user.twoFactorSecret, code);
			}

			if (!passed && backupCode) {
				const backup = user.backupCodes.find((entry) => entry.codeHash === hashToken(backupCode));
				if (backup) {
					passed = true;
					await prisma.twoFactorBackupCode.update({
						where: { id: backup.id },
						data: { usedAt: new Date() }
					});
				}
			}

			if (!passed) {
				return json({ error: 'Two-factor code required or invalid' }, { status: 401 });
			}
		}

		await prisma.user.update({
			where: { id: user.id },
			data: { lastLogin: new Date() }
		});

		const authUser = { id: user.id, email: user.email, name: user.name };
		await issueSession(event, authUser);

		return json({ user: authUser });
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

		return json({ error: 'Login failed due to a server error' }, { status: 500 });
	}
};
