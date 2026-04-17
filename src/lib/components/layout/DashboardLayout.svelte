<script lang="ts">
	import MainLayout from '$lib/components/layout/MainLayout.svelte';

	let { children } = $props();
</script>

<MainLayout>
	<div class="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">{@render children()}</div>
</MainLayout>
