<script lang="ts">
	import { apiRequest } from '$lib/utils/http';

	let idToken = $state('');
	let loading = $state(false);
	let error = $state('');

	async function onGoogleTokenSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		loading = true;

		try {
			const result = await apiRequest<{ user?: { id: string }; error?: string }>('/api/auth/google', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ idToken })
			});

			if (!result.ok) {
				error = result.error ?? 'Google sign-in failed';
				return;
			}

			window.location.href = '/dashboard';
		} catch {
			error = 'Google sign-in failed';
		} finally {
			loading = false;
		}
	}
</script>

<form class="space-y-3" onsubmit={onGoogleTokenSubmit}>
	<p class="text-xs text-text-secondary">
		Google SDK UI is pending. For now, you can submit a valid Google ID token for backend
		verification.
	</p>
	<input
		bind:value={idToken}
		class="w-full rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary"
		placeholder="Paste Google ID token"
		type="text"
	/>
	{#if error}
		<p class="text-sm text-urgent">{error}</p>
	{/if}
	<button
		class="w-full rounded-[8px] border border-border bg-surface px-4 py-2 font-semibold text-text-primary hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] disabled:opacity-60"
		disabled={loading || !idToken}
		type="submit"
	>
		{loading ? 'Verifying token...' : 'Continue with Google token'}
	</button>
</form>
