<script lang="ts">
	const { verified } = $props<{ verified: boolean }>();
</script>

<section class="mx-auto mt-16 max-w-xl rounded-[8px] border border-border bg-surface p-8 shadow-sm">
	<h1 class="text-2xl font-bold text-text-primary">Email verified</h1>
	<p class="mt-2 text-sm text-text-secondary">
		Your email has been verified. You can sign in now.
	</p>
	<a
		class="mt-6 inline-flex rounded-[8px] bg-primary px-4 py-2 font-semibold text-white hover:opacity-90"
		href="/auth/login"
	>
		Go to sign in
	</a>
</section>
