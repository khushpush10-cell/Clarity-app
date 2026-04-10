<script lang="ts">
	import { apiRequest } from '$lib/utils/http';

	let email = $state('');
	let loading = $state(false);
	let message = $state('');
	let error = $state('');

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		message = '';
		loading = true;

		const result = await apiRequest<{ success?: boolean; error?: string }>('/api/auth/forgot-password', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email })
		});

		if (!result.ok) {
			error = result.error ?? 'Unable to send reset email';
			loading = false;
			return;
		}

		message = 'If that email exists, a reset link was sent.';
		loading = false;
	}
</script>

<section class="mx-auto mt-16 max-w-xl rounded-[8px] border border-border bg-surface p-8 shadow-sm">
	<h1 class="text-2xl font-bold text-text-primary">Reset your password</h1>
	<p class="mt-2 text-sm text-text-secondary">We will send a reset link to your email.</p>

	<form class="mt-6 space-y-4" onsubmit={onSubmit}>
		<label class="block text-sm font-medium text-text-primary" for="email">Email</label>
		<input
			id="email"
			bind:value={email}
			class="w-full rounded-[8px] border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
			required
			type="email"
		/>

		{#if error}
			<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">
				{error}
			</p>
		{/if}
		{#if message}
			<p class="rounded-[8px] border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
				{message}
			</p>
		{/if}

		<button
			class="w-full rounded-[8px] bg-primary px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60"
			disabled={loading}
			type="submit"
		>
			{loading ? 'Sending...' : 'Send reset link'}
		</button>
	</form>
</section>
