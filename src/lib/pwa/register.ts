export function registerPwa() {
	if (typeof window === 'undefined') return;
	if (!('serviceWorker' in navigator)) return;

	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js').catch(() => {
			// ignore registration errors in local dev
		});
	});
}
