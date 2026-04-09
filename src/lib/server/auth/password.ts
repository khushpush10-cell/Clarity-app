import { hash, compare } from 'bcryptjs';

import { PASSWORD_SALT_ROUNDS } from '$lib/server/auth/constants';

export async function hashPassword(password: string): Promise<string> {
	return hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
	return compare(password, passwordHash);
}
