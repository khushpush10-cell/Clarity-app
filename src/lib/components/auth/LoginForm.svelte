<script lang="ts">
	import { goto } from '$app/navigation';

	import GoogleButton from '$lib/components/auth/GoogleButton.svelte';

	let email = $state('');
	let password = $state('');
	let totpCode = $state('');
	let backupCode = $state('');
	let isSubmitting = $state(false);
	let error = $state('');

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		isSubmitting = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					email,
					password,
					totpCode: totpCode || undefined,
					backupCode: backupCode || undefined
				})
			});

			const contentType = response.headers.get('content-type') ?? '';
			const payload = contentType.includes('application/json')
				? await response.json()
				: { error: `Request failed (${response.status})` };

			if (!response.ok) {
				error = payload.error ?? 'Login failed';
				return;
			}

			await goto('/dashboard');
		} catch {
			error = 'Unable to log in right now. Please check database connection and try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<section class="rounded-[8px] border border-border bg-surface p-8 shadow-sm">
	<h1 class="text-2xl font-bold text-text-primary">Sign in to Clarity</h1>
	<p class="mt-2 text-sm text-text-secondary">Use your email and password to continue.</p>

	<form class="mt-6 space-y-4" onsubmit={onSubmit}>
		<label class="block text-sm font-medium text-text-primary" for="email">Email</label>
		<input
			id="email"
			bind:value={email}
			class="w-full rounded-[8px] border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
			required
			type="email"
		/>

		<label class="block text-sm font-medium text-text-primary" for="password">Password</label>
		<input
			id="password"
			bind:value={password}
			class="w-full rounded-[8px] border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
			minlength="8"
			required
			type="password"
		/>

		<label class="block text-sm font-medium text-text-primary" for="totp"
			>Authenticator code (optional)</label
		>
		<input
			id="totp"
			bind:value={totpCode}
			class="w-full rounded-[8px] border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
			maxlength="6"
			placeholder="123456"
			type="text"
		/>

		<label class="block text-sm font-medium text-text-primary" for="backup"
			>Backup code (optional)</label
		>
		<input
			id="backup"
			bind:value={backupCode}
			class="w-full rounded-[8px] border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
			placeholder="backup code"
			type="text"
		/>

		{#if error}
			<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">
				{error}
			</p>
		{/if}

		<button
			class="w-full rounded-[8px] bg-primary px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60"
			disabled={isSubmitting}
			type="submit"
		>
			{isSubmitting ? 'Signing in...' : 'Sign in'}
		</button>
	</form>

	<div class="my-5 border-t border-border"></div>

	<GoogleButton />

	<p class="mt-6 text-sm text-text-secondary">
		No account? <a class="font-semibold text-secondary" href="/auth/register">Create one</a>
	</p>
</section>
