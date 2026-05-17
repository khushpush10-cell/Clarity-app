import { redirect } from '@sveltejs/kit';
import { shouldRequireAuth } from '$lib/server/auth/guards';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (shouldRequireAuth(locals.user)) {
		throw redirect(302, '/auth/login');
	}
	throw redirect(302, '/tasks');
};
