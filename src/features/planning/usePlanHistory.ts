import { computed, type ComputedRef, nextTick, ref, type Ref } from "vue";

// Types & Interfaces
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";

const HISTORY_LIMIT: number = 50;

/**
 * # Plan History
 *
 * Undo/redo for the plan editor. `record` wraps an edit handler: the plan
 * is snapshotted before it runs and the step closes once the handler has
 * settled and Vue has flushed, so follow-up edits made by watchers in that
 * flush (hab auto-optimisation) belong to the same step. Snapshots are the
 * saved fields as JSON, which makes them clones and comparable.
 *
 * @author jplacht
 *
 * @param {Ref<IPlanDefinition>} plan Plan
 * @param {Ref<string | undefined>} planName Plan Name
 */
export function usePlanHistory(
	plan: Ref<IPlanDefinition>,
	planName: Ref<string | undefined>
) {
	const undoStack: Ref<string[]> = ref([]);
	const redoStack: Ref<string[]> = ref([]);
	const saved: Ref<string> = ref("");
	const savedAt: Ref<Date> = ref(new Date());
	// bumps on every change to the history: a new step, undo, redo, save
	const revision: Ref<number> = ref(0);

	// open step
	let depth: number = 0;
	let pending: string = "";
	let pendingKey: string | undefined;
	// key of the last recorded step, consecutive steps with it are merged
	let lastKey: string | undefined;
	let restoring: boolean = false;

	function serialize(): string {
		return JSON.stringify({
			// a cleared name is no name, as on a blank plan
			plan_name: planName.value || undefined,
			plan_cogc: plan.value.plan_cogc,
			plan_corphq: plan.value.plan_corphq,
			plan_permits_used: plan.value.plan_permits_used,
			plan_data: plan.value.plan_data,
		});
	}

	function restore(snapshot: string): void {
		const state: Pick<
			IPlanDefinition,
			| "plan_name"
			| "plan_cogc"
			| "plan_corphq"
			| "plan_permits_used"
			| "plan_data"
		> = JSON.parse(snapshot);
		planName.value = state.plan_name;
		plan.value.plan_cogc = state.plan_cogc;
		plan.value.plan_corphq = state.plan_corphq;
		plan.value.plan_permits_used = state.plan_permits_used;
		plan.value.plan_data = state.plan_data;

		revision.value++;
		restoring = true;
		nextTick(() => (restoring = false));
	}

	function close(): void {
		if (--depth > 0) return;
		if (serialize() === pending) return;

		if (pendingKey === undefined || pendingKey !== lastKey) {
			undoStack.value.push(pending);
			if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift();
		}
		redoStack.value = [];
		lastKey = pendingKey;
	}

	/**
	 * Wraps an edit handler so each call becomes an undo step
	 *
	 * @param fn Handler
	 * @param {string} [coalesceKey] Consecutive steps with this key merge
	 * into one, e.g. typing a name
	 * @returns Wrapped handler
	 */
	function record<A extends unknown[], R>(
		fn: (...args: A) => R,
		coalesceKey?: string
	): (...args: A) => R {
		return (...args: A): R => {
			if (depth++ === 0) {
				pending = serialize();
				pendingKey = coalesceKey;
				revision.value++;
			}
			const settle = () => void nextTick(close);

			try {
				const result: R = fn(...args);
				Promise.resolve(result).then(settle, settle);
				return result;
			} catch (err) {
				settle();
				throw err;
			}
		};
	}

	/**
	 * Wraps every handler of an object with `record`
	 */
	function wrap<T extends Record<string, (...args: never[]) => unknown>>(
		handlers: T
	): T {
		return Object.fromEntries(
			Object.entries(handlers).map(([name, fn]) => [name, record(fn)])
		) as T;
	}

	function undo(): void {
		const snapshot: string | undefined = undoStack.value.pop();
		if (snapshot === undefined) return;
		redoStack.value.push(serialize());
		lastKey = undefined;
		restore(snapshot);
	}

	function redo(): void {
		const snapshot: string | undefined = redoStack.value.pop();
		if (snapshot === undefined) return;
		undoStack.value.push(serialize());
		lastKey = undefined;
		restore(snapshot);
	}

	/**
	 * Marks a state as saved (load, save, reload) and clears the history.
	 * A save passes the snapshot it sent, so edits made while it was in
	 * flight stay unsaved.
	 *
	 * @param {string} [snapshot] Saved state, defaults to the current one
	 */
	function markSaved(snapshot: string = serialize()): void {
		undoStack.value = [];
		redoStack.value = [];
		lastKey = undefined;
		saved.value = snapshot;
		savedAt.value = new Date();
		revision.value++;
	}

	markSaved();

	const modified: ComputedRef<boolean> = computed(
		() => serialize() !== saved.value
	);
	const canUndo: ComputedRef<boolean> = computed(
		() => undoStack.value.length > 0
	);
	const canRedo: ComputedRef<boolean> = computed(
		() => redoStack.value.length > 0
	);

	return {
		modified,
		savedAt,
		revision,
		canUndo,
		canRedo,
		undo,
		redo,
		markSaved,
		/** true until the flush after an undo/redo */
		isRestoring: (): boolean => restoring,
		/** the current state, to pass to `markSaved` after a save */
		snapshot: serialize,
		/** the last saved state, the base of a save conflict */
		savedSnapshot: (): string => saved.value,
		record,
		wrap,
	};
}
