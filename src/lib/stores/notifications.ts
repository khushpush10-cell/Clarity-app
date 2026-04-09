import { writable } from 'svelte/store';

export interface ToastItem {
	id: string;
	type: 'info' | 'success' | 'warning' | 'error';
	title: string;
	message: string;
}

const { subscribe, update } = writable<ToastItem[]>([]);

export const notifications = {
	subscribe,
	push: (item: ToastItem) => update((items) => [item, ...items]),
	dismiss: (id: string) => update((items) => items.filter((item) => item.id !== id)),
	clear: () => update(() => [])
};
