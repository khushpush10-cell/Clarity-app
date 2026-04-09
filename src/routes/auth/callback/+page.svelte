<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import { apiRequest } from '$lib/utils/http';

	let message = $state('Processing authentication callback...');

	onMount(() => {
		const url = new URL(window.location.href);
		const idToken = url.searchParams.get('id_token');

		if (!idToken) {
			message = 'Missing Google ID token. Redirecting to login...';
			setTimeout(() => {
				void goto('/auth/login');
			}, 1000);
			return;
		}

		void (async () => {
			const result = await apiRequest<{ user?: { id: string }; error?: string }>('/api/auth/google', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ idToken })
			});

			if (result.ok) {
				await goto('/dashboard');
				return;
			}

			message = `${result.error ?? 'Google authentication failed'}. Redirecting to login...`;
			setTimeout(() => {
				void goto('/auth/login');
			}, 1500);
		})();
	});
</script>

<div
	class="mx-auto mt-16 max-w-xl rounded-[8px] border border-border bg-surface p-6 text-sm text-text-secondary"
>
	{message}
</div>
