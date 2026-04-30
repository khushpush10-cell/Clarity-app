const SW_VERSION = '2026-04-30-1';
const SW_VERSION_KEY = 'clarity_sw_version';

export function registerPwa() {
	if (typeof window === 'undefined') return;
	if (!('serviceWorker' in navigator)) return;

	window.addEventListener('load', async () => {
		try {
			const previousVersion = localStorage.getItem(SW_VERSION_KEY);
			if (previousVersion !== SW_VERSION) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				await Promise.all(registrations.map((registration) => registration.unregister()));
				if ('caches' in window) {
					const names = await caches.keys();
					await Promise.all(names.map((name) => caches.delete(name)));
				}
				localStorage.setItem(SW_VERSION_KEY, SW_VERSION);
			}

			await navigator.serviceWorker.register('/service-worker.js');
		} catch {
			// ignore service worker registration errors
		}
	});
}
