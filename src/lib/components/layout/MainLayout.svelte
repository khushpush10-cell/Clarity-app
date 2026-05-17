<script lang="ts">
	import { page } from '$app/state';

	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { children } = $props();

	let sidebarCollapsed = $state(false);
</script>

<div class="flex min-h-screen bg-background">
	<Sidebar collapsed={sidebarCollapsed} onToggle={() => (sidebarCollapsed = !sidebarCollapsed)} />
	<div class="flex min-w-0 flex-1 flex-col">
		<Header />
		<div class="mobile-safe-px p-3 pb-20 md:p-4 lg:p-6">{@render children()}</div>
	</div>
</div>

<nav class="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-2 py-2 lg:hidden">
	<div class="grid grid-cols-5 gap-1 text-center text-xs">
		<a aria-label="Dashboard" class={`grid place-items-center rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/dashboard') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/dashboard"><Icon name="dashboard" size={18} /></a>
		<a aria-label="Tasks" class={`grid place-items-center rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/tasks') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/tasks"><Icon name="tasks" size={18} /></a>
		<a aria-label="Calendar" class={`grid place-items-center rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/calendar') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/calendar"><Icon name="calendar" size={18} /></a>
		<a aria-label="Analytics" class={`grid place-items-center rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/analytics') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/analytics"><Icon name="analytics" size={18} /></a>
		<a aria-label="Settings" class={`grid place-items-center rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/settings') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/settings"><Icon name="settings" size={18} /></a>
	</div>
</nav>
