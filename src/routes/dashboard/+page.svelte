<script lang="ts">
	import ProgressCore from '$lib/components/core/ProgressCore.svelte';
	import FocusTimer from '$lib/components/focus/FocusTimer.svelte';
	import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
</script>

<DashboardLayout>
	<section class="space-y-4 xl:col-span-8">
		<section class="app-card p-5 md:p-6">
			<h1 class="text-3xl font-semibold text-text-primary">Dashboard</h1>
			<p class="mt-2 text-sm text-text-secondary">A calm overview for planning your day with steady momentum.</p>

			<div class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">Today plan</p>
					<ul class="mt-2 space-y-1 text-sm text-text-primary">
						<li>Top 3 tasks</li>
						<li>1 key habit check</li>
						<li>1 focus sprint</li>
					</ul>
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">Consistency</p>
					<p class="mt-2 text-lg font-semibold text-text-primary">Build small wins daily</p>
					<p class="mt-1 text-sm text-text-secondary">Sage progress indicates healthy routines.</p>
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">Quick add</p>
					<div class="mt-2 flex flex-wrap gap-2">
						<a class="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-on-primary" href="/tasks">Task</a>
						<a class="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-primary" href="/habits">Habit</a>
						<a class="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-primary" href="/dashboard#focus">Focus</a>
					</div>
				</article>
			</div>
		</section>

		<div id="focus">
			<FocusTimer />
		</div>
	</section>

	<section class="xl:col-span-4">
		<ProgressCore />
	</section>
</DashboardLayout>
