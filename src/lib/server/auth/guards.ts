import { env } from '$env/dynamic/private';

type MaybeUser = {
	id: string;
	email: string;
	name: string | null;
	avatarUrl?: string | null;
} | null;

export function shouldRequireAuth(user: MaybeUser) {
	return !user && env.AUTH_BYPASS !== '1';
}
