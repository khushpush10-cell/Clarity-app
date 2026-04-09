<script lang="ts">
	let {
		text = '',
		className = '',
		children
	} = $props<{ text?: string; className?: string; children?: () => unknown }>();
</script>

<span class={`group relative inline-flex ${className}`}>
	{@render children?.()}
	<span class="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 rounded-[8px] border border-border bg-surface px-2 py-1 text-xs text-text-primary shadow-sm group-hover:block">
		{text}
	</span>
</span>
