import { writable } from 'svelte/store';

export interface HabitLogItem {
	id: string;
	completedDate: string;
	count: number;
	notes: string | null;
}

export interface HabitItem {
	id: string;
	name: string;
	description: string | null;
	color: string;
	frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM';
	targetCount: number;
	streakCurrent: number;
	streakBest: number;
	lastCompletedDate: string | null;
	logs?: HabitLogItem[];
}

interface HabitsState {
	items: HabitItem[];
	loading: boolean;
	error: string | null;
}

const initialState: HabitsState = {
	items: [],
	loading: false,
	error: null
};

function createHabitsStore() {
	const { subscribe, set, update } = writable<HabitsState>(initialState);

	return {
		subscribe,
		setItems: (items: HabitItem[]) => update((state) => ({ ...state, items })),
		setLoading: (loading: boolean) => update((state) => ({ ...state, loading })),
		setError: (error: string | null) => update((state) => ({ ...state, error })),
		reset: () => set(initialState)
	};
}

export const habits = createHabitsStore();
