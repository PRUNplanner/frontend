import {
	computed,
	type ComputedRef,
	onUnmounted,
	ref,
	type Ref,
	watch,
} from "vue";
import { isEqual } from "lodash-es";

// Stores
import { useUserStore } from "@/stores/userStore";

// Composables
import { reportError } from "@/lib/analytics/useAnalytics";
import { useQuery } from "@/lib/query_cache/useQuery";
import { tokenExpiresAt } from "@/lib/crossTab";

// API
import { sendPlanDraftKeepalive } from "@/features/api/planData.api";

// Util
import {
	isDraftConflict,
	threeWay,
} from "@/features/save_conflict/saveConflict.util";
import { diffPlan } from "@/features/planning_data/planDiff";
import { versionState } from "@/features/planning/planVersions.util";

// Types & Interfaces
import type {
	PlanCreateData,
	PlanDraft,
	PlanDraftSaveData,
} from "@/features/api/schemas/planningData.schemas";
import type { IPlanDiffable } from "@/features/planning_data/planDiff";
import type { IPlanDraftOptions } from "@/features/planning/usePlanDraft.types";

// an autosave goes out this long after the last edit
export const DRAFT_DEBOUNCE_MS = 3_000;
// an edit this close to the token's expiry refreshes it first
const TOKEN_MARGIN_MS = 60_000;
// a save, delete or preview waits this long for a keepalive's answer
const KEEPALIVE_WAIT_MS = 3_000;

/**
 * @returns {Promise<void>} Resolves after the longest wait for a keepalive's answer
 */
function keepaliveWait(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, KEEPALIVE_WAIT_MS));
}

// a failed draft write is reported once per session, not per edit
let failureReported: boolean = false;

/**
 * A plan state as the history serializes it, comparable with `isEqual`
 * (a missing name is no key, as in `JSON.stringify`)
 *
 * @param {IPlanDiffable} plan Plan or draft
 * @returns {IPlanDiffable} Comparable state
 */
function toState(plan: IPlanDiffable): IPlanDiffable {
	return JSON.parse(versionState(plan));
}

/**
 * The plan's autosave draft in the backend: a debounced PUT after edits,
 * a keepalive flush when the page hides, a DELETE when the edits are
 * undone or discarded. Draft writes and plan saves share one queue per
 * tab. The draft this tab last saw (`updated_at`, kept as the raw string:
 * the backend compares microseconds) goes with every write, so another
 * tab's or device's draft is never replaced without asking.
 *
 * @author jplacht
 *
 * @param {IPlanDraftOptions} options Plan state and callbacks
 */
export function usePlanDraft(options: IPlanDraftOptions) {
	const userStore = useUserStore();
	const { modified, conflict } = options;

	// updated_at of the draft this tab last saw, null: none
	let seen: string | null = null;
	// last state a write confirmed or a load applied; an equal one is
	// not sent again
	let confirmed: IPlanDiffable | null = null;
	// states sent since `confirmed`: a stored draft equal to one is ours
	let sent: IPlanDiffable[] = [];
	// the other draft that stopped autosaving, and the one whose dialog
	// was closed (not asked again in this plan view)
	let foreign: string | null = null;
	let dismissed: string | null = null;
	// a keepalive write went out, its answer (updated_at) never arrives
	let flushed: boolean = false;
	// the keepalive write in flight, settled with its answer
	let keepalive: Promise<void> | null = null;

	let timer: ReturnType<typeof setTimeout> | undefined;
	let queue: Promise<unknown> = Promise.resolve();

	const refArmed: Ref<boolean> = ref(false);
	const refInFlight: Ref<number> = ref(0);
	const refFailed: Ref<boolean> = ref(false);
	const refStopped: Ref<boolean> = ref(false);
	// when the stored draft was written, null without one
	const draftSavedAt: Ref<Date | null> = ref(null);
	// the draft came from an earlier visit and wasn't written since
	const draftResumed: Ref<boolean> = ref(false);

	/** a write is waiting for its debounce or on its answer */
	const draftPending: ComputedRef<boolean> = computed(
		() => refArmed.value || refInFlight.value > 0
	);
	/** the last write failed or autosaving stopped on another draft */
	const draftFailed: ComputedRef<boolean> = computed(
		() => refFailed.value || refStopped.value
	);

	/**
	 * The access token is still valid this long; unreadable counts as
	 * valid (the backend decides)
	 *
	 * @param {number} margin Milliseconds it must still be valid
	 * @returns {boolean} Fresh
	 */
	function tokenFresh(margin: number): boolean {
		const expiresAt: number | undefined = tokenExpiresAt(
			userStore.accessToken
		);
		return expiresAt === undefined || expiresAt - Date.now() > margin;
	}

	function current(): IPlanDiffable {
		return JSON.parse(options.snapshot());
	}

	function disarm(): void {
		clearTimeout(timer);
		timer = undefined;
		refArmed.value = false;
	}

	function forget(): void {
		seen = null;
		confirmed = null;
		sent = [];
		flushed = false;
		draftSavedAt.value = null;
		draftResumed.value = false;
	}

	/**
	 * A state is stored as the draft: the states sent before it are settled
	 * with it, the ones sent after it still wait for their answers
	 *
	 * @param {IPlanDiffable} state Stored state
	 * @param {string} updatedAt Its updated_at, raw
	 */
	function stored(state: IPlanDiffable, updatedAt: string): void {
		seen = updatedAt;
		confirmed = state;
		const index: number = sent.findLastIndex((s) => isEqual(s, state));
		sent = index === -1 ? [] : sent.slice(index + 1);
		flushed &&= sent.length > 0;
		draftSavedAt.value = new Date(updatedAt);
	}

	function adopt(draft: PlanDraft): void {
		stored(toState(draft), draft.updated_at);
	}

	function failed(err: unknown): void {
		refFailed.value = true;
		if (failureReported) return;
		failureReported = true;
		reportError(err);
	}

	/**
	 * Runs `fn` after everything queued before it, reading the draft state
	 * when it runs, not when it was queued
	 *
	 * @param {() => Promise<T>} fn Draft write, delete or plan save
	 * @returns {Promise<T>} What `fn` returns
	 */
	function enqueue<T>(fn: () => Promise<T>): Promise<T> {
		refInFlight.value++;
		const run: Promise<T> = queue.then(fn, fn);
		queue = run.catch(() => {}).finally(() => refInFlight.value--);
		return run;
	}

	function draftData(base: string): PlanDraftSaveData {
		const { empire_uuid: _empire, ...data }: PlanCreateData =
			options.payload();
		return { ...data, base_modified_at: base, draft_updated_at: seen };
	}

	/**
	 * Stores the editor state as the draft
	 *
	 * @param {boolean} [force] Send even if equal to the confirmed state
	 * @param {boolean} [retried] Second try after a 409, no third
	 */
	async function write(force = false, retried = false): Promise<void> {
		const planUuid: string | undefined = options.planUuid();
		const base: string | undefined = options.base();
		if (!planUuid || !base || !options.enabled() || refStopped.value)
			return;
		if (!modified.value) return;

		const state: IPlanDiffable = current();
		if (!force && isEqual(state, confirmed)) return;

		sent.push(state);
		try {
			const updatedAt: string = await useQuery("SavePlanDraft", {
				planUuid,
				data: draftData(base),
			}).execute();
			stored(state, updatedAt);
			draftResumed.value = false;
			refFailed.value = false;
		} catch (err) {
			if (isDraftConflict(err)) return reconcile(planUuid, retried);
			failed(err);
		}
	}

	/**
	 * After a 409: the stored draft may be our own write whose answer got
	 * lost, then it's taken silently; anything else stops autosaving and
	 * asks
	 *
	 * @param {string} planUuid Plan Uuid
	 * @param {boolean} retried Already resent once
	 */
	async function reconcile(
		planUuid: string,
		retried: boolean
	): Promise<void> {
		let draft: PlanDraft | null;
		try {
			draft = await fetchDraft(planUuid);
		} catch (err) {
			return failed(err);
		}

		if (draft === null) {
			forget();
			if (!retried) await write(false, true);
			return;
		}

		const theirs: IPlanDiffable = toState(draft);
		const mine: IPlanDiffable = current();
		// ours: the draft this tab last stored or took (a keepalive's answer
		// may land during the GET), one it sent, or the editor's state
		if (
			!retried &&
			(draft.updated_at === seen ||
				isEqual(theirs, mine) ||
				sent.some((s) => isEqual(s, theirs)))
		) {
			adopt(draft);
			if (!isEqual(theirs, mine)) await write(false, true);
			return;
		}

		stop(draft);
	}

	function stop(draft: PlanDraft): void {
		disarm();
		refStopped.value = true;
		foreign = draft.updated_at;
		// the dialog waits on the user, outside the queue so a save can run
		if (dismissed !== draft.updated_at) void ask(draft);
	}

	/**
	 * Another draft than ours is stored: keep ours (overwrite it) or load
	 * it (reload). Closing keeps autosaving stopped.
	 *
	 * @param {PlanDraft} draft The other draft
	 * @param {"draft" | "draft_base"} [variant] draft_base: a draft of an
	 * older save, found when the plan opened
	 */
	async function ask(
		draft: PlanDraft,
		variant: "draft" | "draft_base" = "draft"
	): Promise<void> {
		const loaded: IPlanDiffable = JSON.parse(options.savedSnapshot());
		const mine: IPlanDiffable = current();
		const theirs: IPlanDiffable = toState(draft);

		const choice = await conflict.ask({
			deleted: false,
			variant,
			options: ["overwrite", "reload"],
			loadChanges: async () =>
				variant === "draft"
					? threeWay(loaded, theirs, mine, diffPlan)
					: // the draft is "yours", its older base isn't known
						threeWay(loaded, loaded, theirs, diffPlan),
		});

		if (choice === null) {
			dismissed = draft.updated_at;
			refStopped.value = true;
			foreign = draft.updated_at;
			return;
		}

		refStopped.value = false;
		foreign = null;
		refFailed.value = false;
		if (variant === "draft_base") {
			seen = draft.updated_at;
			if (choice === "overwrite") {
				options.applyDraft(draft);
				confirmed = null;
				await enqueue(() => write(true));
			} else await enqueue(() => remove("reload"));
			return;
		}

		if (choice === "overwrite") {
			seen = draft.updated_at;
			await enqueue(() => write(true));
		} else {
			adopt(draft);
			draftResumed.value = true;
			options.applyDraft(draft);
		}
	}

	/**
	 * After a keepalive write the stored draft is ours, but this tab never
	 * got its updated_at: read it before a save or a delete, so neither
	 * meets our own draft as another one
	 *
	 * @param {string} planUuid Plan Uuid
	 */
	async function settleFlush(planUuid: string): Promise<void> {
		// its answer, if the page lived on, is the surest way to know
		if (keepalive) await Promise.race([keepalive, keepaliveWait()]);
		if (!flushed) return;
		flushed = false;
		try {
			const draft: PlanDraft | null = await fetchDraft(planUuid);
			if (draft && sent.some((s) => isEqual(s, toState(draft))))
				adopt(draft);
		} catch (err) {
			reportError(err);
		}
	}

	function fetchDraft(planUuid: string): Promise<PlanDraft | null> {
		return useQuery("GetPlanDraft", { planUuid }).execute({
			forceRefetch: true,
		});
	}

	/**
	 * Deletes the draft this tab saw. An undo back to the saved state and
	 * a reload drop nothing worth asking about on a 409; a discard asks.
	 *
	 * @param {"undo" | "discard" | "reload"} reason Why
	 * @returns {Promise<"ok" | "conflict" | "failed">} Deleted (or none),
	 * another draft is stored, or the call failed
	 */
	async function remove(
		reason: "undo" | "discard" | "reload"
	): Promise<"ok" | "conflict" | "failed"> {
		const planUuid: string | undefined = options.planUuid();
		if (planUuid) await settleFlush(planUuid);
		if (!planUuid || seen === null) {
			forget();
			return "ok";
		}

		try {
			await useQuery("DeletePlanDraft", {
				planUuid,
				draftUpdatedAt: seen,
			}).execute();
			forget();
			return "ok";
		} catch (err) {
			if (!isDraftConflict(err)) {
				failed(err);
				return "failed";
			}
			if (reason !== "discard") return "conflict";

			let draft: PlanDraft | null;
			try {
				draft = await fetchDraft(planUuid);
			} catch (fetchErr) {
				failed(fetchErr);
				return "failed";
			}
			if (draft === null) {
				forget();
				return "ok";
			}
			stop(draft);
			return "conflict";
		}
	}

	function schedule(): void {
		disarm();
		if (!options.enabled() || refStopped.value) return;
		if (!modified.value) {
			// undone back to the saved state; a keepalive draft is ours too
			if (seen !== null || flushed) void enqueue(() => remove("undo"));
			else forget();
			return;
		}
		// an applied draft schedules nothing
		if (isEqual(current(), confirmed)) return;

		refArmed.value = true;
		// the keepalive send on hide can't refresh an expired token
		if (!tokenFresh(TOKEN_MARGIN_MS))
			void userStore.performTokenRefresh().catch(() => {});
		timer = setTimeout(() => {
			disarm();
			void enqueue(() => write());
		}, DRAFT_DEBOUNCE_MS);
	}

	watch(() => (options.enabled() ? options.snapshot() : null), schedule);

	/**
	 * The page hides or unloads: send what the debounce still holds with
	 * a keepalive request, which outlives the page. While the page lives
	 * on, its answer is taken as a write's, and a draft it didn't store is
	 * written again the normal way (which refreshes the token). An expired
	 * token goes that way at once: the keepalive can't refresh it.
	 */
	function flush(): void {
		if (!refArmed.value) return;
		disarm();
		const planUuid: string | undefined = options.planUuid();
		const base: string | undefined = options.base();
		const token: string | undefined = userStore.accessToken;
		if (!planUuid || !base || !token || !modified.value) return;

		if (!tokenFresh(0)) {
			void enqueue(() => write());
			return;
		}

		const state: IPlanDiffable = current();
		const answer = sendPlanDraftKeepalive(planUuid, draftData(base), token);
		// over the cap: stays pending, the leave warning still asks
		if (answer === false) {
			refArmed.value = true;
			return;
		}

		sent.push(state);
		flushed = true;
		refInFlight.value++;
		const pending: Promise<void> = answer
			.then((updatedAt) => {
				// not stored: write again, the normal way. It sends the
				// newest state, or nothing if a later write already did
				if (updatedAt === null) {
					void enqueue(() => write());
					return;
				}
				// a later state was stored meanwhile
				if (!sent.includes(state)) return;
				stored(state, updatedAt);
				draftResumed.value = false;
				refFailed.value = false;
			})
			.finally(() => {
				refInFlight.value--;
				if (keepalive === pending) keepalive = null;
			});
		keepalive = pending;
	}

	function onVisibilityChange(): void {
		if (document.visibilityState === "hidden") flush();
	}

	document.addEventListener("visibilitychange", onVisibilityChange);
	window.addEventListener("pagehide", flush);

	onUnmounted(() => {
		document.removeEventListener("visibilitychange", onVisibilityChange);
		window.removeEventListener("pagehide", flush);
		// leaving the page in the app: the write goes out now
		if (refArmed.value) {
			disarm();
			void enqueue(() => write());
		}
	});

	/**
	 * When the plan opens: a draft of the same save is applied as unsaved
	 * edits, one of an older save asks first. With a draft the plan is
	 * refreshed before comparing, a long-lived tab may show an older save.
	 *
	 * @param {() => Promise<void>} refresh Loads the saved plan
	 * @returns {Promise<PlanDraft | null>} The applied draft
	 */
	async function load(
		refresh: () => Promise<void>
	): Promise<PlanDraft | null> {
		const planUuid: string | undefined = options.planUuid();
		if (!planUuid || !options.enabled()) return null;

		let draft: PlanDraft | null;
		try {
			draft = await fetchDraft(planUuid);
		} catch (err) {
			// the first write meets a stored draft as a 409 and asks then
			reportError(err);
			return null;
		}
		if (draft === null) return null;

		await refresh();
		// nothing beyond the save (e.g. a draft that stayed behind a save):
		// dropped quietly, whatever save it was made on
		if (isEqual(toState(draft), JSON.parse(options.savedSnapshot()))) {
			seen = draft.updated_at;
			await enqueue(() => remove("reload"));
			return null;
		}
		if (draft.base_modified_at === options.base()) {
			adopt(draft);
			draftResumed.value = true;
			options.applyDraft(draft);
			return draft;
		}

		disarm();
		refStopped.value = true;
		foreign = draft.updated_at;
		await ask(draft, "draft_base");
		return null;
	}

	/**
	 * Runs a plan save in the queue with the draft this tab saw. The
	 * backend deletes that draft with the save; another one stays. A
	 * successful save calls `saved` inside `fn`.
	 *
	 * @param {(draftUpdatedAt: string | null) => Promise<T>} fn The save
	 * @returns {Promise<T>} What the save returns
	 */
	async function withSave<T>(
		fn: (draftUpdatedAt: string | null) => Promise<T>
	): Promise<T> {
		disarm();
		try {
			return await enqueue(async () => {
				const planUuid: string | undefined = options.planUuid();
				if (planUuid) await settleFlush(planUuid);
				return fn(seen);
			});
		} finally {
			// edits made meanwhile are autosaved again
			schedule();
		}
	}

	/**
	 * After a successful save: our draft is gone. A known other draft
	 * stays in the backend and keeps autosaving stopped, without asking
	 * again on every edit.
	 */
	function saved(): void {
		forget();
		refFailed.value = false;
		if (foreign !== null) dismissed = foreign;
	}

	/**
	 * Discards the edits' draft. A stopped tab leaves the other draft alone.
	 *
	 * @returns {Promise<"ok" | "conflict" | "failed">} See `remove`
	 */
	async function discard(): Promise<"ok" | "conflict" | "failed"> {
		disarm();
		if (refStopped.value) return "ok";
		return enqueue(() => remove("discard"));
	}

	/**
	 * Drops the draft after the edits were dropped or copied elsewhere
	 * (reload, save as new), never asks
	 */
	async function drop(): Promise<void> {
		disarm();
		if (refStopped.value) return;
		await enqueue(() => remove("reload"));
	}

	/**
	 * Sends a write the debounce still holds now and waits for every write
	 * under way (queued ones, a keepalive and the rewrite its answer may
	 * queue), e.g. before a preview, which pauses autosave
	 *
	 * @returns {Promise<void>} Resolves once they are through
	 */
	async function writeNow(): Promise<void> {
		if (refArmed.value) {
			disarm();
			void enqueue(() => write());
		}
		// a keepalive hanging on a bad network doesn't hold the preview
		if (keepalive) await Promise.race([keepalive, keepaliveWait()]);
		await queue;
	}

	/**
	 * "Draft not saved" clicked: a failed write is retried, a stopped one
	 * asks again, also for a draft whose dialog was closed
	 */
	async function retry(): Promise<void> {
		const planUuid: string | undefined = options.planUuid();
		if (!planUuid) return;
		if (!refStopped.value) {
			await enqueue(() => write(true));
			return;
		}

		let draft: PlanDraft | null;
		try {
			draft = await fetchDraft(planUuid);
		} catch (err) {
			return failed(err);
		}
		if (draft === null) {
			refStopped.value = false;
			foreign = null;
			forget();
			await enqueue(() => write(true));
			return;
		}
		dismissed = null;
		stop(draft);
	}

	return {
		draftSavedAt,
		draftResumed,
		draftPending,
		draftFailed,
		load,
		withSave,
		saved,
		discard,
		drop,
		retry,
		writeNow,
	};
}
