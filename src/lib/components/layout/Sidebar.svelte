<script lang="ts">
	import { page } from '$app/state';

	const nav = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/tasks', label: 'Tasks' },
		{ href: '/habits', label: 'Habits' },
		{ href: '/calendar', label: 'Calendar' },
		{ href: '/team', label: 'Team' },
		{ href: '/goals', label: 'Goals' },
		{ href: '/analytics', label: 'Analytics' },
		{ href: '/settings', label: 'Settings' }
	];

	let { collapsed = false } = $props<{ collapsed?: boolean }>();
</script>

<aside class={`h-screen border-r border-border bg-surface p-4 ${collapsed ? 'w-20' : 'w-60'}`}>
	<div class="mb-6 border-b border-border pb-4">
		<p class="text-lg font-bold text-primary">Clarity</p>
		{#if !collapsed}
			<p class="text-xs text-text-secondary">Task manager and routines</p>
		{/if}
	</div>

	<nav class="space-y-1">
		{#each nav as item}
			{@const active =
				page.url.pathname === item.href || page.url.pathname.startsWith(`${item.href}/`)}
			<a
				href={item.href}
				class={`block rounded-[8px] px-3 py-2 text-sm font-medium transition ${
					active
						? 'bg-primary text-white'
						: 'text-text-primary hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)]'
				}`}
			>
				{#if collapsed}{item.label.slice(0, 1)}{:else}{item.label}{/if}
			</a>
		{/each}
	</nav>

	{#if !collapsed}
		<div class="mt-8 rounded-[8px] border border-border p-3">
			<p class="text-xs font-semibold text-text-secondary">Quick Filters</p>
			<div class="mt-2 space-y-1 text-sm">
				<a
					class="block rounded-[8px] px-2 py-1 hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)]"
					href="/tasks?filter=today">Today</a
				>
				<a
					class="block rounded-[8px] px-2 py-1 hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)]"
					href="/tasks?filter=upcoming">Upcoming</a
				>
				<a
					class="block rounded-[8px] px-2 py-1 hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)]"
					href="/tasks?filter=overdue">Overdue</a
				>
			</div>
		</div>
	{/if}
</aside>
