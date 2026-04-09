export interface ApiResult<T> {
	ok: boolean;
	status: number;
	data: T | null;
	error: string | null;
	response: Response;
}

function getErrorMessage(payload: unknown, response: Response): string {
	if (payload && typeof payload === 'object' && 'error' in payload) {
		const value = (payload as { error?: unknown }).error;
		if (typeof value === 'string' && value.trim().length > 0) {
			return value;
		}
	}

	if (response.status >= 500) {
		return 'Server error. Please try again.';
	}

	if (response.status === 401) {
		return 'Unauthorized. Please sign in again.';
	}

	if (response.status === 403) {
		return 'You do not have permission for this action.';
	}

	return `Request failed (${response.status})`;
}

export async function apiRequest<T = Record<string, unknown>>(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<ApiResult<T>> {
	const response = await fetch(input, init);
	const contentType = response.headers.get('content-type') ?? '';
	const data = contentType.includes('application/json')
		? ((await response.json()) as T)
		: null;

	if (!response.ok) {
		return {
			ok: false,
			status: response.status,
			data,
			error: getErrorMessage(data, response),
			response
		};
	}

	return { ok: true, status: response.status, data, error: null, response };
}
