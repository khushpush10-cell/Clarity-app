<script lang="ts">
	import { page } from '$app/stores';
	import { apiRequest } from '$lib/utils/http';

	let password = $state('');
	let confirm = $state('');
	let loading = $state(false);
	let message = $state('');
	let error = $state('');

	const token = $derived($page.url.searchParams.get('token') ?? '');

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		message = '';

		if (!token) {
			error = 'Missing reset token.';
			return;
		}
		if (password.length < 8) {
			error = 'Password must be at least 8 characters.';
			return;
		}
		if (password !== confirm) {
			error = 'Passwords do not match.';
			return;
		}

		loading = true;
		const result = await apiRequest<{ success?: boolean; error?: string }>('/api/auth/reset-password', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token, password })
		});

		if (!result.ok) {
			error = result.error ?? 'Unable to reset password';
			loading = false;
			return;
		}

		message = 'Password updated. You can sign in now.';
		loading = false;
	}
</script>

<section class="mx-auto mt-16 max-w-xl rounded-[8px] border border-border bg-surface p-8 shadow-sm">
	<h1 class="text-2xl font-bold text-text-primary">Choose a new password</h1>
	<p class="mt-2 text-sm text-text-secondary">Set a new password for your account.</p>

	<form class="mt-6 space-y-4" onsubmit={onSubmit}>
		<label class="block text-sm font-medium text-text-primary" for="password">New password</label>
		<input
			id="password"
			bind:value={password}
			class="w-full rounded-[8px] border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
			required
			type="password"
		/>
		<label class="block text-sm font-medium text-text-primary" for="confirm">Confirm password</label>
		<input
			id="confirm"
			bind:value={confirm}
			class="w-full rounded-[8px] border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
			required
			type="password"
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
			{loading ? 'Updating...' : 'Update password'}
		</button>
	</form>

	<p class="mt-6 text-sm text-text-secondary">
		<a class="font-semibold text-secondary" href="/auth/login">Back to sign in</a>
	</p>
</section>
