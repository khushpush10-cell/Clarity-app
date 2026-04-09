<script lang="ts">
	let { value = 0 } = $props<{ value?: number }>();
	const normalized = $derived.by(() => Math.max(0, Math.min(100, Math.round(value))));
</script>

<div class="h-2 w-full rounded-full bg-border">
	<div class="h-2 rounded-full bg-success transition-all" style={`width:${normalized}%`}></div>
</div>
