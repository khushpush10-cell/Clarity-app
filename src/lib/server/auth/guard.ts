import type { RequestEvent } from '@sveltejs/kit';

export function requireAuth(
	event: RequestEvent
): asserts event is RequestEvent & { locals: App.Locals & { user: App.SessionUser } } {
	if (!event.locals.user) {
		throw new Error('UNAUTHORIZED');
	}
}
