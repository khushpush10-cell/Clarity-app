<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { apiRequest } from '$lib/utils/http';

	let query = $state('');
	let unread = $state(0);
	let notificationOpen = $state(false);
	let notifications = $state(
		[] as Array<{ id: string; title: string; message: string; read: boolean; link: string | null }>
	);

	onMount(() => {
		void loadNotifications();
	});

	async function loadNotifications() {
		const result = await apiRequest<{ items?: typeof notifications; unread?: number; error?: string }>('/api/notifications');
		if (!result.ok) return;

		notifications = result.data?.items ?? [];
		unread = result.data?.unread ?? 0;
	}

	async function openNotification(item: { id: string; link: string | null }) {
		await apiRequest(`/api/notifications/${item.id}/read`, { method: 'POST' });
		notificationOpen = false;
		await loadNotifications();
		if (item.link) {
			await goto(item.link);
		}
	}

	async function readAll() {
		await apiRequest('/api/notifications/read-all', { method: 'POST' });
		await loadNotifications();
	}

	async function onSearchKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		const value = query.trim();
		if (!value) return;
		await goto(`/tasks?search=${encodeURIComponent(value)}`);
	}

	function toggleTheme() {
		const root = document.documentElement;
		const current = root.getAttribute('data-theme') ?? 'light';
		const next = current === 'dark' ? 'light' : 'dark';
		root.setAttribute('data-theme', next);
		localStorage.setItem('clarity_theme', next);
	}
</script>

<header
	class="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-surface px-3 md:px-4 lg:px-6"
>
	<div class="w-full max-w-2xl">
		<input
			bind:value={query}
			aria-label="Global search"
			class="w-full rounded-full border border-border bg-surface-2 px-4 py-2 text-sm outline-none"
			placeholder="Search tasks, habits, goals..."
			onkeydown={onSearchKeydown}
			type="search"
		/>
	</div>
	<div class="relative ml-3 flex items-center gap-2 text-sm text-text-secondary md:ml-6 md:gap-3">
		<span class="hidden lg:inline">Press J/K to navigate</span>
		<button
			class="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-text-primary"
			onclick={toggleTheme}
			type="button"
		>
			Theme
		</button>

		<div class="relative">
			<button
				class="relative rounded-full border border-border bg-surface-2 px-3 py-1.5 text-text-primary"
				onclick={() => (notificationOpen = !notificationOpen)}
				type="button"
			>
				Notifications
				{#if unread > 0}
					<span class="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-attention text-[10px] text-white">{unread}</span>
				{/if}
			</button>
			{#if notificationOpen}
				<div class="absolute right-0 z-20 mt-2 w-80 rounded-[14px] border border-border bg-surface p-3 shadow-lg">
					<div class="mb-2 flex items-center justify-between">
						<p class="text-xs font-semibold tracking-[0.06em] text-text-secondary uppercase">Notifications</p>
						<button class="text-xs text-secondary" onclick={readAll} type="button">Mark all read</button>
					</div>
					<div class="max-h-80 space-y-2 overflow-auto">
						{#if notifications.length === 0}
							<p class="text-xs text-text-secondary">No notifications</p>
						{:else}
							{#each notifications as item (item.id)}
								<button
									class={`w-full rounded-[14px] border px-3 py-2 text-left ${item.read ? 'border-border bg-surface-2' : 'border-secondary bg-secondary-tint'}`}
									onclick={() => openNotification(item)}
									type="button"
								>
									<p class="text-sm font-medium text-text-primary">{item.title}</p>
									<p class="mt-1 text-xs text-text-secondary">{item.message}</p>
								</button>
							{/each}
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<a class="hidden rounded-full border border-border px-3 py-1.5 text-text-primary md:inline" href="/settings">{page.data.user?.name ?? 'User'}</a>
	</div>
</header>
