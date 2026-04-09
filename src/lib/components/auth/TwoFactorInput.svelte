<script lang="ts">
	let { className = '' } = $props<{ className?: string }>();
</script>

<section class={`rounded-[8px] border border-border bg-surface p-4 ${className}`}>
	<h2 class="text-sm font-semibold text-text-primary">TwoFactorInput</h2>
</section>
