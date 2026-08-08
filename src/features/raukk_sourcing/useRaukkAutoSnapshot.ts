import { onScopeDispose, Ref, watch } from "vue";

// Stores
import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

// Composables
import { computePlanSnapshot } from "@/features/raukk_sourcing/useRaukkSnapshot";

// Types & Interfaces
import { IRaukkSnapshot } from "@/features/raukk_sourcing/raukkSourcing.types";
import { IRaukkSnapshotContext } from "@/features/raukk_sourcing/useRaukkSnapshot";

/** Reactive plan context the automatic snapshot upkeep runs against */
export interface IRaukkAutoSnapshotContext extends IRaukkSnapshotContext {
	/** Read only plans are never computed for */
	disabled: Ref<boolean>;
}

/** Quiet time after the last change before a computation starts */
const RAUKK_AUTO_SNAPSHOT_DEBOUNCE_MS: number = 1000;

/**
 * Keeps the open plans sourcing snapshot current without the sourcing
 * tab being open.
 *
 * The snapshot is computed and stored automatically — always for this
 * single plan only, never for its chain — whenever
 *  - the view opens on a plan without a snapshot or with a stale one,
 *  - the plans calculation result changes (any plan edit),
 *  - the stored snapshot is flagged stale, e.g. by a sourcing
 *    configuration change, a plan save or an upstream recomputation.
 *
 * Computations are debounced so a burst of edits results in one run,
 * and reruns requested while one is in flight are folded into a single
 * follow up. Failures are logged and swallowed, background upkeep must
 * never take the plan view down; the sourcing tab's manual compute
 * button stays the surface that displays errors.
 *
 * @author raukk
 *
 * @param {IRaukkAutoSnapshotContext} context Plan Context
 */
export function useRaukkAutoSnapshot(context: IRaukkAutoSnapshotContext): void {
	const sourcingStore = useRaukkSourcingStore();

	let timer: ReturnType<typeof setTimeout> | undefined = undefined;
	let running: boolean = false;
	let rerunRequested: boolean = false;

	/** Saved, writable plans only */
	function eligible(): boolean {
		return !context.disabled.value && context.planUuid.value !== undefined;
	}

	/**
	 * Schedules a computation after the debounce quiet time, restarting
	 * the clock on every call.
	 */
	function schedule(): void {
		if (!eligible()) return;

		if (timer !== undefined) clearTimeout(timer);

		timer = setTimeout(() => {
			timer = undefined;
			void run();
		}, RAUKK_AUTO_SNAPSHOT_DEBOUNCE_MS);
	}

	/**
	 * Computes and stores the plans snapshot. A run arriving while one
	 * is in flight is folded into a single rerun afterwards.
	 */
	async function run(): Promise<void> {
		const planUuid: string | undefined = context.planUuid.value;

		if (!eligible() || planUuid === undefined) return;

		if (running) {
			rerunRequested = true;
			return;
		}

		running = true;

		try {
			await computePlanSnapshot({
				planUuid,
				planName: context.planName.value,
				planetNaturalId: context.planetNaturalId.value ?? "",
				cxUuid: context.cxUuid.value,
				planResult: context.planResult.value,
			});
		} catch (error) {
			console.warn("[raukk] automatic snapshot upkeep failed", error);
		} finally {
			running = false;

			if (rerunRequested) {
				rerunRequested = false;
				schedule();
			}
		}
	}

	// any plan edit produces a new calculation result
	watch(context.planResult, () => schedule());

	// staleness flagged by config changes, saves or upstream recomputes
	watch(
		() =>
			context.planUuid.value !== undefined
				? sourcingStore.snapshots[context.planUuid.value]?.stale
				: undefined,
		(isStale) => {
			if (isStale === true) schedule();
		}
	);

	// view opened on a plan without a current snapshot
	if (eligible() && context.planUuid.value !== undefined) {
		const snapshot: IRaukkSnapshot | undefined =
			sourcingStore.snapshots[context.planUuid.value];

		if (snapshot === undefined || snapshot.stale) schedule();
	}

	onScopeDispose(() => {
		if (timer !== undefined) clearTimeout(timer);
	});
}
