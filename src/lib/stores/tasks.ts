import { writable } from 'svelte/store';

import type { TaskView } from '$lib/types/app';

export type TaskStatusUi = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriorityUi = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskItem {
	id: string;
	workspaceId: string;
	creatorId: string;
	assigneeId: string | null;
	title: string;
	description: string | null;
	status: TaskStatusUi;
	priority: TaskPriorityUi;
	dueDate: string | null;
	dueTime: string | null;
	completedAt: string | null;
	colorTag: string | null;
	parentTaskId: string | null;
	createdAt: string;
	updatedAt: string;
	position: number;
}

interface TaskState {
	items: TaskItem[];
	view: TaskView;
	search: string;
	statusFilter: TaskStatusUi | 'ALL';
	priorityFilter: TaskPriorityUi | 'ALL';
	loading: boolean;
	error: string | null;
}

const initialState: TaskState = {
	items: [],
	view: 'list',
	search: '',
	statusFilter: 'ALL',
	priorityFilter: 'ALL',
	loading: false,
	error: null
};

function createTaskStore() {
	const { subscribe, set, update } = writable<TaskState>(initialState);

	return {
		subscribe,
		setItems: (items: TaskItem[]) => update((state) => ({ ...state, items })),
		setView: (view: TaskView) => update((state) => ({ ...state, view })),
		setSearch: (search: string) => update((state) => ({ ...state, search })),
		setStatusFilter: (statusFilter: TaskState['statusFilter']) =>
			update((state) => ({ ...state, statusFilter })),
		setPriorityFilter: (priorityFilter: TaskState['priorityFilter']) =>
			update((state) => ({ ...state, priorityFilter })),
		setLoading: (loading: boolean) => update((state) => ({ ...state, loading })),
		setError: (error: string | null) => update((state) => ({ ...state, error })),
		reset: () => set(initialState)
	};
}

export const tasks = createTaskStore();


