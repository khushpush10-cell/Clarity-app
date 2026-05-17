<script lang="ts">
	import { page } from '$app/state';

	import Icon from '$lib/components/ui/Icon.svelte';

	const nav = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ href: '/tasks', label: 'Tasks', icon: 'tasks' },
		{ href: '/calendar', label: 'Calendar', icon: 'calendar' },
		{ href: '/analytics', label: 'Analytics', icon: 'analytics' },
		{ href: '/settings', label: 'Settings', icon: 'settings' }
	] as const;

	let { collapsed = false, onToggle } = $props<{ collapsed?: boolean; onToggle?: () => void }>();
</script>

<aside class={`sticky top-0 hidden h-screen border-r border-border bg-surface p-4 transition-[width] lg:block ${collapsed ? 'w-20' : 'w-60'}`}>
	<div class="mb-6 flex items-center justify-between gap-2 border-b border-border pb-4">
		{#if !collapsed}
			<div>
				<p class="text-3xl font-semibold text-primary">Clarity</p>
				<p class="text-sm text-text-secondary">Task manager and routines</p>
			</div>
		{:else}
			<p class="text-2xl font-semibold text-primary">C</p>
		{/if}
		<button
			aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
			class="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-text-primary"
			onclick={onToggle}
			type="button"
		>
			<Icon name={collapsed ? 'chevrons-right' : 'chevrons-left'} size={17} />
		</button>
	</div>

	<nav class="space-y-1">
		{#each nav as item}
			{@const active =
				page.url.pathname === item.href || page.url.pathname.startsWith(`${item.href}/`)}
			<a
				href={item.href}
				aria-label={item.label}
				class={`flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition ${
					active
						? 'bg-secondary-tint text-secondary'
						: 'text-text-primary hover:bg-surface-2'
				}`}
			>
				<Icon name={item.icon} size={18} />
				{#if !collapsed}<span>{item.label}</span>{/if}
			</a>
		{/each}
	</nav>
</aside>
