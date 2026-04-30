<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';

	let { children } = $props();

	let sidebarCollapsed = $state(false);

	onMount(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName);
			if (isTyping) return;

			if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
				document.dispatchEvent(new CustomEvent('clarity:complete-hotkey'));
			}
		};

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});
</script>

<div class="flex min-h-screen bg-background">
	<Sidebar collapsed={sidebarCollapsed} />
	<div class="flex min-w-0 flex-1 flex-col">
		<Header />
		<div class="mobile-safe-px p-3 pb-20 md:p-4 lg:p-6">{@render children()}</div>
	</div>
</div>

<nav class="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-2 py-2 lg:hidden">
	<div class="grid grid-cols-5 gap-1 text-center text-xs">
		<a class={`rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/dashboard') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/dashboard">Dashboard</a>
		<a class={`rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/tasks') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/tasks">Tasks</a>
		<a class={`rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/habits') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/habits">Habits</a>
		<a class={`rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/calendar') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/calendar">Calendar</a>
		<a class={`rounded-xl px-2 py-2 ${page.url.pathname.startsWith('/settings') ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} href="/settings">More</a>
	</div>
</nav>
