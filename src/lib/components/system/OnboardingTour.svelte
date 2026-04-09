<script lang="ts">
	import { onMount } from 'svelte';

	let open = $state(false);
	let step = $state(0);

	const fallbackStep = { title: 'Welcome', text: 'Let us get started.' };
	const steps = [
		{ title: 'Welcome to Clarity', text: 'Use Dashboard for your progress core and quick stats.' },
		{ title: 'Tasks Board', text: 'Create tasks and switch between list, kanban, calendar, and table.' },
		{ title: 'Habits & Focus', text: 'Track streaks and run focus sessions to gain consistency score.' },
		{ title: 'Team Workspaces', text: 'Create workspaces, assign roles, and monitor team workload.' },
		{ title: 'Shortcuts', text: 'Use J/K navigation and Ctrl/Cmd+Enter for quick completion actions.' }
	];

	const currentStep = $derived.by(() => steps.at(step) ?? fallbackStep);

	onMount(() => {
		const done = localStorage.getItem('clarity_onboarding_done');
		if (!done) open = true;
	});

	function next() {
		if (step >= steps.length - 1) {
			finish();
			return;
		}
		step += 1;
	}

	function finish() {
		localStorage.setItem('clarity_onboarding_done', '1');
		open = false;
	}
</script>

{#if open}
	<div class="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
		<section class="w-full max-w-xl rounded-[8px] border border-border bg-surface p-6 shadow-xl">
			<p class="text-xs font-semibold tracking-[0.08em] text-secondary uppercase">Onboarding</p>
			<h2 class="mt-2 text-xl font-bold text-text-primary">{currentStep.title}</h2>
			<p class="mt-2 text-sm text-text-secondary">{currentStep.text}</p>
			<div class="mt-5 flex items-center justify-between">
				<p class="text-xs text-text-secondary">Step {step + 1} of {steps.length}</p>
				<div class="flex gap-2">
					<button class="rounded-[8px] border border-border px-3 py-2 text-sm" onclick={finish} type="button">Skip</button>
					<button class="rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white" onclick={next} type="button">{step === steps.length - 1 ? 'Finish' : 'Next'}</button>
				</div>
			</div>
		</section>
	</div>
{/if}
