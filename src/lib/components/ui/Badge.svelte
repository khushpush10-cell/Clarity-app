<script lang="ts">
	let {
		variant = 'default',
		className = '',
		children
	} = $props<{
		variant?: 'default' | 'success' | 'warning' | 'danger';
		className?: string;
		children?: () => unknown;
	}>();

	const styles: Record<string, string> = {
		default: 'border-border bg-background text-text-primary',
		success: 'border-success/30 bg-success/10 text-success',
		warning: 'border-warning/30 bg-warning/10 text-warning',
		danger: 'border-urgent/30 bg-urgent/10 text-urgent'
	};
</script>

<span class={`inline-flex items-center rounded-[8px] border px-2 py-1 text-xs font-medium ${styles[variant]} ${className}`}>
	{@render children?.()}
</span>
