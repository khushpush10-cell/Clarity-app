<script lang="ts">
	let { error, status } = $props<{ error: App.Error; status: number }>();
</script>

<div class="mx-auto mt-16 max-w-2xl rounded-[8px] border border-border bg-surface p-8 text-center">
	<p class="text-sm font-semibold text-urgent">Error {status}</p>
	<h1 class="mt-2 text-2xl font-bold text-text-primary">Something went wrong</h1>
	<p class="mt-3 text-text-secondary">{error?.message ?? 'Unexpected application error.'}</p>
	<a
		class="mt-6 inline-block rounded-[8px] bg-primary px-4 py-2 text-sm font-semibold text-white"
		href="/dashboard">Go to Dashboard</a
	>
</div>
