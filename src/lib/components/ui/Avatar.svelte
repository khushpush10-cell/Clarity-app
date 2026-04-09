<script lang="ts">
	let {
		name = 'User',
		src = '',
		className = ''
	} = $props<{ name?: string; src?: string; className?: string }>();
	const initials = $derived.by(() =>
		name
			.split(' ')
			.map((part: string) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
</script>

<div class={`inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-xs font-semibold text-text-primary ${className}`}>
	{#if src}
		<img alt={name} class="h-full w-full object-cover" src={src} />
	{:else}
		{initials}
	{/if}
</div>
