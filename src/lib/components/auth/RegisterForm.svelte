<script lang="ts">
	import { goto } from '$app/navigation';

	import GoogleButton from '$lib/components/auth/GoogleButton.svelte';
	import { apiRequest } from '$lib/utils/http';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let error = $state('');

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		isSubmitting = true;

		try {
			const result = await apiRequest<{ user?: { id: string }; error?: string }>('/api/auth/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, email, password })
			});

			if (!result.ok) {
				error = result.error ?? 'Registration failed';
				return;
			}

			await goto('/dashboard');
		} catch {
			error = 'Unable to register right now. Please check database connection and try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<section class="rounded-[8px] border border-border bg-surface p-8 shadow-sm">
	<h1 class="text-2xl font-bold text-text-primary">Create your Clarity account</h1>
	<p class="mt-2 text-sm text-text-secondary">
		Start organizing tasks and routines in one workspace.
	</p>

	<form class="mt-6 space-y-4" onsubmit={onSubmit}>
		<label class="block text-sm font-medium text-text-primary" for="name">Name</label>
		<input
			id="name"
			bind:value={name}
			class="w-full rounded-[8px] border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
			required
			type="text"
		/>

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
			{isSubmitting ? 'Creating account...' : 'Create account'}
		</button>
	</form>

	<div class="my-5 border-t border-border"></div>

	<GoogleButton />

	<p class="mt-6 text-sm text-text-secondary">
		Already have an account? <a class="font-semibold text-secondary" href="/auth/login">Sign in</a>
	</p>
</section>
