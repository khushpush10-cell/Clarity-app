<script lang="ts">
	let { className = '', children } = $props<{ className?: string; children?: () => unknown }>();
</script>

<section class={`rounded-[8px] border border-border bg-surface p-4 ${className}`}>
	{@render children?.()}
</section>
