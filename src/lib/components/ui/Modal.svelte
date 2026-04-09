<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		open = false,
		title,
		actions,
		children
	} = $props<{
		open?: boolean;
		title?: () => unknown;
		actions?: () => unknown;
		children?: () => unknown;
	}>();
	const dispatch = createEventDispatcher<{ close: void }>();
</script>

{#if open}
	<div class="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
		<section class="w-full max-w-lg rounded-[8px] border border-border bg-surface p-5 shadow-xl">
			<div class="flex items-start justify-between">
				<h2 class="text-lg font-semibold text-text-primary">
					{#if title}
						{@render title()}
					{:else}
						Modal
					{/if}
				</h2>
				<button class="rounded-[8px] border border-border px-2 py-1 text-xs" onclick={() => dispatch('close')} type="button">Close</button>
			</div>
			<div class="mt-3 text-sm text-text-secondary">
				{#if children}
					{@render children()}
				{/if}
			</div>
			<div class="mt-4 flex justify-end gap-2">
				{#if actions}
					{@render actions()}
				{/if}
			</div>
		</section>
	</div>
{/if}
