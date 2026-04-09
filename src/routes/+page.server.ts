import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (env.AUTH_BYPASS === '1' || locals.user) {
		throw redirect(302, '/dashboard');
	}
};
