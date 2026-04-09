<script lang="ts">
	import MainLayout from '$lib/components/layout/MainLayout.svelte';

	let { children } = $props();
</script>

<MainLayout>
	<div class="grid grid-cols-12 gap-6">{@render children()}</div>
</MainLayout>
