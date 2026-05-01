<script lang="ts">
	import { onMount } from 'svelte';

	let open = $state(false);
	let step = $state(0);

	const fallbackStep = { title: 'Welcome', text: 'Start with one clear task and keep the workspace calm.' };
	const steps = [
		{ title: 'Welcome to Clarity', text: 'A quiet workspace for tasks, routines, and weekly progress.' },
		{ title: 'Tasks first', text: 'Create a task, add labels or recurrence when needed, and keep the list focused.' },
		{ title: 'Plan your day', text: 'Use Dashboard for a simple weekly summary and the next recommended action.' },
		{ title: 'Review and adjust', text: 'Use Analytics and Settings to refine your workflow over time.' }
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
		<section class="w-full max-w-xl rounded-[14px] border border-border bg-surface p-6 shadow-xl">
			<p class="text-xs font-semibold tracking-[0.08em] text-secondary uppercase">Onboarding</p>
			<h2 class="mt-2 text-xl font-bold text-text-primary">{currentStep.title}</h2>
			<p class="mt-2 text-sm text-text-secondary">{currentStep.text}</p>
			<div class="mt-5 flex items-center justify-between">
				<p class="text-xs text-text-secondary">Step {step + 1} of {steps.length}</p>
				<div class="flex gap-2">
					<button class="rounded-[14px] border border-border px-3 py-2 text-sm" onclick={finish} type="button">Skip</button>
					<button class="rounded-[14px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary" onclick={next} type="button">{step === steps.length - 1 ? 'Finish' : 'Next'}</button>
				</div>
			</div>
		</section>
	</div>
{/if}
