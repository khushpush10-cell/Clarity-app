<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		items = [],
		value = '',
		placeholder = 'Select...',
		className = ''
	} = $props<{
		items?: Array<{ label: string; value: string }>;
		value?: string;
		placeholder?: string;
		className?: string;
	}>();

	const dispatch = createEventDispatcher<{ change: string }>();
</script>

<select
	bind:value
	class={`w-full rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary ${className}`}
	onchange={() => dispatch('change', value)}
>
	<option value="" disabled>{placeholder}</option>
	{#each items as item (item.value)}
		<option value={item.value}>{item.label}</option>
	{/each}
</select>
