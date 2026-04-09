<script lang="ts">
	let { value = 0, className = '' } = $props<{ value?: number; className?: string }>();
	const normalized = $derived.by(() => Math.max(0, Math.min(100, Math.round(value))));
</script>

<div class={`h-2 w-full rounded-full bg-border ${className}`}>
	<div class="h-2 rounded-full bg-primary transition-all" style={`width:${normalized}%`}></div>
</div>
