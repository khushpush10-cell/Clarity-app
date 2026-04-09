import { json } from '@sveltejs/kit';

export function ok<T>(data: T, status = 200): Response {
	return json(data, { status });
}

export function fail(message: string, status = 400): Response {
	return json({ error: message }, { status });
}
