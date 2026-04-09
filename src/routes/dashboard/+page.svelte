<script lang="ts">
	import ProgressCore from '$lib/components/core/ProgressCore.svelte';
	import FocusTimer from '$lib/components/focus/FocusTimer.svelte';
	import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
</script>

<DashboardLayout>
	<section class="col-span-8 space-y-4">
		<section class="rounded-[8px] border border-border bg-surface p-6">
			<h1 class="text-2xl font-bold text-text-primary">Dashboard</h1>
			<p class="mt-2 text-sm text-text-secondary">Core overview and productivity signals.</p>

			<div class="mt-6 grid grid-cols-3 gap-4">
				<article class="rounded-[8px] border border-border bg-background p-4">
					<p class="text-xs text-text-secondary">Today</p>
					<p class="mt-1 text-lg font-semibold text-text-primary">Task Focus</p>
					<p class="mt-2 text-sm text-text-secondary">Track and complete priority items.</p>
				</article>
				<article class="rounded-[8px] border border-border bg-background p-4">
					<p class="text-xs text-text-secondary">Habits</p>
					<p class="mt-1 text-lg font-semibold text-text-primary">Streak Momentum</p>
					<p class="mt-2 text-sm text-text-secondary">Log habits to keep your core stable.</p>
				</article>
				<article class="rounded-[8px] border border-border bg-background p-4">
					<p class="text-xs text-text-secondary">Focus</p>
					<p class="mt-1 text-lg font-semibold text-text-primary">Session Energy</p>
					<p class="mt-2 text-sm text-text-secondary">Focus sessions boost consistency score.</p>
				</article>
			</div>
		</section>

		<FocusTimer />
	</section>

	<section class="col-span-4">
		<ProgressCore />
	</section>
</DashboardLayout>
