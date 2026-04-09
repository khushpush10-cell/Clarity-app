<script lang="ts">
	let {
		type = 'button',
		variant = 'primary',
		disabled = false,
		className = '',
		children
	} = $props<{
		type?: 'button' | 'submit' | 'reset';
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		disabled?: boolean;
		className?: string;
		children?: () => unknown;
	}>();

	const variants: Record<string, string> = {
		primary: 'bg-primary text-white hover:opacity-90',
		secondary: 'bg-secondary text-white hover:opacity-90',
		danger: 'bg-urgent text-white hover:opacity-90',
		ghost: 'border border-border bg-surface text-text-primary hover:bg-background'
	};
</script>

<button
	{type}
	{disabled}
	class={`rounded-[8px] px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
>
	{@render children?.()}
</button>
