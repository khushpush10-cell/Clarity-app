import { json } from '@sveltejs/kit';
import qrcode from 'qrcode';

import type { RequestHandler } from './$types';

import { createTotpSecret, verifyTotp } from '$lib/server/auth/service';
import { twoFactorEnableSchema } from '$lib/server/auth/schemas';
import { createRandomToken, hashToken } from '$lib/server/auth/tokens';
import { prisma } from '$lib/server/prisma';

function createBackupCodes(): string[] {
	return Array.from({ length: 8 }).map(() => createRandomToken(6));
}

export const POST: RequestHandler = async (event) => {
	const currentUser = event.locals.user;
	if (!currentUser) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await event.request.json().catch(() => null);

	if (!body?.secret) {
		const { secret, otpauthUrl } = createTotpSecret(currentUser.email);
		const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

		return json({ secret, otpauthUrl, qrCodeDataUrl });
	}

	const payload = twoFactorEnableSchema.safeParse(body);
	if (!payload.success) {
		return json({ error: 'Invalid input', issues: payload.error.issues }, { status: 400 });
	}

	const secret = String(body.secret);
	const valid = verifyTotp(secret, payload.data.code);
	if (!valid) {
		return json({ error: 'Invalid authenticator code' }, { status: 400 });
	}

	const backupCodes = createBackupCodes();

	await prisma.$transaction([
		prisma.user.update({
			where: { id: currentUser.id },
			data: {
				twoFactorEnabled: true,
				twoFactorSecret: secret
			}
		}),
		prisma.twoFactorBackupCode.deleteMany({ where: { userId: currentUser.id } }),
		prisma.twoFactorBackupCode.createMany({
			data: backupCodes.map((code) => ({
				userId: currentUser.id,
				codeHash: hashToken(code)
			}))
		})
	]);

	return json({ success: true, backupCodes });
};
