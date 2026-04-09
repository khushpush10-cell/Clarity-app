import { writable } from 'svelte/store';

import type { AuthUser } from '$lib/types/app';

interface AuthState {
	user: AuthUser | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

const initialState: AuthState = {
	user: null,
	isAuthenticated: false,
	isLoading: true
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,
		setUser: (user: AuthUser | null) =>
			update((state) => ({ ...state, user, isAuthenticated: !!user })),
		setLoading: (isLoading: boolean) => update((state) => ({ ...state, isLoading })),
		reset: () => set(initialState)
	};
}

export const auth = createAuthStore();
