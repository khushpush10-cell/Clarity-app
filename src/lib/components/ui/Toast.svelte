<script lang="ts">
	import { notifications } from '$lib/stores/notifications';

	let items = $state([] as Array<{ id: string; type: 'info' | 'success' | 'warning' | 'error'; title: string; message: string }>);
	const timers = new Map<string, ReturnType<typeof setTimeout>>();

	notifications.subscribe((value) => {
		items = value;

		for (const item of value) {
			if (timers.has(item.id)) continue;
			const handle = setTimeout(() => {
				notifications.dismiss(item.id);
				timers.delete(item.id);
			}, 4500);
			timers.set(item.id, handle);
		}
	});
</script>

<div class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
	{#each items as item (item.id)}
		<article class="pointer-events-auto rounded-[8px] border border-border bg-surface p-3 shadow-lg">
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="text-sm font-semibold text-text-primary">{item.title}</p>
					<p class="mt-1 text-xs text-text-secondary">{item.message}</p>
				</div>
				<button class="rounded-[8px] border border-border px-2 py-1 text-xs" onclick={() => notifications.dismiss(item.id)} type="button">x</button>
			</div>
		</article>
	{/each}
</div>
