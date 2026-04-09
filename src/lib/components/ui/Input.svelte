<script lang="ts">
	let {
		value = '',
		placeholder = '',
		type = 'text',
		name,
		required = false,
		disabled = false,
		className = ''
	} = $props<{
		value?: string | number;
		placeholder?: string;
		type?: string;
		name?: string;
		required?: boolean;
		disabled?: boolean;
		className?: string;
	}>();
</script>

<input
	bind:value
	{type}
	{name}
	{placeholder}
	{required}
	{disabled}
	class={`w-full rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:bg-background ${className}`}
/>
