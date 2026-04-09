import { writable } from 'svelte/store';

import type { ThemeMode } from '$lib/types/app';

interface UiState {
	sidebarOpen: boolean;
	theme: ThemeMode;
}

const initialState: UiState = {
	sidebarOpen: true,
	theme: 'light'
};

function createUiStore() {
	const { subscribe, set, update } = writable<UiState>(initialState);

	return {
		subscribe,
		toggleSidebar: () => update((state) => ({ ...state, sidebarOpen: !state.sidebarOpen })),
		setTheme: (theme: ThemeMode) => update((state) => ({ ...state, theme })),
		reset: () => set(initialState)
	};
}

export const ui = createUiStore();
