const CACHE = 'clarity-v1';
const APP_SHELL = ['/', '/dashboard', '/tasks', '/habits', '/goals', '/analytics', '/offline.html'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => {
			return cache.addAll(APP_SHELL);
		})
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
		})
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				const cloned = response.clone();
				caches.open(CACHE).then((cache) => cache.put(event.request, cloned));
				return response;
			})
			.catch(async () => {
				const cached = await caches.match(event.request);
				if (cached) return cached;

				if (event.request.mode === 'navigate') {
					const offline = await caches.match('/offline.html');
					if (offline) return offline;
				}

				return new Response('Offline', { status: 503, statusText: 'Offline' });
			})
	);
});
