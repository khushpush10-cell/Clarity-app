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

<aside class={`sticky top-0 hidden h-screen border-r border-border bg-surface p-4 lg:block ${collapsed ? 'w-20' : 'w-60'}`}>
	<div class="mb-6 border-b border-border pb-4">
		<p class="text-3xl font-semibold text-primary">Clarity</p>
		{#if !collapsed}
			<p class="text-sm text-text-secondary">Task manager and routines</p>
		{/if}
	</div>

	<nav class="space-y-1">
		{#each nav as item}
			{@const active =
				page.url.pathname === item.href || page.url.pathname.startsWith(`${item.href}/`)}
			<a
				href={item.href}
				class={`block rounded-full px-3 py-2 text-sm font-medium transition ${
					active
						? 'bg-secondary-tint text-secondary'
						: 'text-text-primary hover:bg-surface-2'
				}`}
			>
				{#if collapsed}{item.label.slice(0, 1)}{:else}{item.label}{/if}
			</a>
		{/each}
	</nav>

	{#if !collapsed}
		<div class="mt-8 rounded-[14px] border border-border bg-surface-2 p-3">
			<p class="text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">Quick Filters</p>
			<div class="mt-2 space-y-1 text-sm">
				<a class="block rounded-full px-2 py-1 hover:bg-surface" href="/tasks?filter=today">Today</a>
				<a class="block rounded-full px-2 py-1 hover:bg-surface" href="/tasks?filter=upcoming">Upcoming</a>
				<a class="block rounded-full px-2 py-1 hover:bg-surface" href="/tasks?filter=overdue">Overdue</a>
			</div>
		</div>
	{/if}
</aside>
