import { writable } from 'svelte/store';

export interface ProgressCoreState {
	level: number;
	experiencePoints: number;
	weeklyCompletionPercentage: number;
	consistencyScore: number;
	totalTasksCompleted: number;
	totalStreakDays: number;
	unlockedFeatures: string[];
	rewards: string[];
	loading: boolean;
	error: string | null;
}

const initialState: ProgressCoreState = {
	level: 1,
	experiencePoints: 0,
	weeklyCompletionPercentage: 0,
	consistencyScore: 0,
	totalTasksCompleted: 0,
	totalStreakDays: 0,
	unlockedFeatures: ['core_dashboard'],
	rewards: [],
	loading: false,
	error: null
};

function createProgressCoreStore() {
	const { subscribe, set, update } = writable<ProgressCoreState>(initialState);

	return {
		subscribe,
		setState: (next: Partial<ProgressCoreState>) => update((state) => ({ ...state, ...next })),
		setLoading: (loading: boolean) => update((state) => ({ ...state, loading })),
		setError: (error: string | null) => update((state) => ({ ...state, error })),
		reset: () => set(initialState)
	};
}

export const progressCore = createProgressCoreStore();
