import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computed, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import {
	DRAFT_DEBOUNCE_MS,
	usePlanDraft,
} from "@/features/planning/usePlanDraft";
import { useUserStore } from "@/stores/userStore";
import { mountComposable } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	PlanCreateData,
	PlanDraft,
} from "@/features/api/schemas/planningData.schemas";
import type { useSaveConflict } from "@/features/save_conflict/useSaveConflict";

const m = vi.hoisted(() => ({
	query: vi.fn(),
	reportError: vi.fn(),
	keepalive: vi.fn(),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, args: unknown) => ({
		execute: (options?: unknown) => m.query(name, args, options),
	}),
}));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	reportError: m.reportError,
}));
vi.mock("@/features/api/planData.api", () => ({
	sendPlanDraftKeepalive: m.keepalive,
}));

const pinia = createPinia();
// a raw updated_at: microseconds the backend compares exactly
const U1 = "2026-10-30T12:00:01.123456Z";
const U2 = "2026-10-30T12:00:02.654321Z";
const OTHER = "2026-10-30T12:05:00.000001Z";

function plan(n: number) {
	return {
		plan_name: "Plan",
		plan_cogc: "---" as const,
		plan_corphq: false,
		plan_permits_used: 1,
		plan_data: { n } as unknown as PlanDraft["plan_data"],
	};
}

function draftOf(n: number, updated_at: string, base = "b0"): PlanDraft {
	return {
		...plan(n),
		planet_natural_id: "KW-020c",
		base_modified_at: base,
		updated_at,
	};
}

// an access token expiring then
function jwt(expiresAt: number): string {
	const claims = btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1000) }));
	return `h.${claims}.s`;
}

function conflictError() {
	return Object.assign(new Error("409"), {
		status: 409,
		responseData: { code: "draft_conflict", updated_at: OTHER },
	});
}

// answers per query; a function may throw
let answers: Record<string, (args: never) => unknown>;
function calls(name: string) {
	return m.query.mock.calls.filter(([n]) => n === name);
}

async function setup(options: { enabled?: boolean; base?: string } = {}) {
	const state = ref(plan(1));
	const saved = ref(JSON.stringify(plan(1)));
	const enabled = ref(options.enabled ?? true);
	const snapshot = () => JSON.stringify(state.value);
	const ask = vi.fn();
	const applyDraft = vi.fn((d: PlanDraft) => {
		state.value = { ...plan(0), plan_data: d.plan_data };
	});
	const { result, wrapper } = await mountComposable(
		() =>
			usePlanDraft({
				planUuid: () => "p-1",
				enabled: () => enabled.value,
				modified: computed(() => snapshot() !== saved.value),
				snapshot,
				savedSnapshot: () => saved.value,
				payload: () =>
					({
						...state.value,
						planet_natural_id: "KW-020c",
						empire_uuid: "e-1",
					}) as PlanCreateData,
				base: () => options.base ?? "b0",
				applyDraft,
				conflict: { ask } as unknown as ReturnType<
					typeof useSaveConflict
				>,
			}),
		{ pinia }
	);

	/** an edit and its debounce */
	async function edit(n: number, wait = true) {
		state.value = plan(n);
		await flushPromises();
		if (wait) {
			vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
			await flushPromises();
		}
	}

	return { result, wrapper, state, saved, enabled, ask, applyDraft, edit };
}

describe("usePlanDraft", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(pinia);
		vi.clearAllMocks();
		useUserStore().$patch({ accessToken: "tok", refreshToken: "r" });
		answers = { SavePlanDraft: () => U1, DeletePlanDraft: () => undefined };
		m.query.mockImplementation(async (name: string, args: never) =>
			answers[name]?.(args)
		);
		// no answer: the page closed
		m.keepalive.mockImplementation(() => new Promise(() => {}));
	});
	afterEach(() => vi.useRealTimers());

	it("reports a failed write once, shows it, and retries on the next edit", async () => {
		answers.SavePlanDraft = () => {
			throw new Error("offline");
		};
		const s = await setup();
		await s.edit(2);
		await s.edit(3);
		expect(m.reportError).toHaveBeenCalledTimes(1);
		expect(s.result.draftFailed.value).toBe(true);

		answers.SavePlanDraft = () => U1;
		await s.edit(4);
		expect(s.result.draftFailed.value).toBe(false);
	});

	it("writes 3 s after the last edit, with the raw updated_at it got back", async () => {
		const s = await setup();
		await s.edit(2, false);
		expect(s.result.draftPending.value).toBe(true);
		vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS - 1);
		await flushPromises();
		expect(calls("SavePlanDraft")).toHaveLength(0);

		vi.advanceTimersByTime(1);
		await flushPromises();
		const [[, first]] = calls("SavePlanDraft");
		expect(first.data).toMatchObject({
			plan_data: { n: 2 },
			base_modified_at: "b0",
			draft_updated_at: null,
		});
		expect(first.data).not.toHaveProperty("empire_uuid");
		expect(s.result.draftPending.value).toBe(false);
		expect(s.result.draftSavedAt.value).toEqual(new Date(U1));

		answers.SavePlanDraft = () => U2;
		await s.edit(3);
		expect(calls("SavePlanDraft")[1][1].data.draft_updated_at).toBe(U1);
	});

	it("skips a write equal to the last one and deletes when undone to the saved state", async () => {
		const s = await setup();
		await s.edit(2);
		await s.edit(3, false);
		await s.edit(2);
		expect(calls("SavePlanDraft")).toHaveLength(1);

		await s.edit(1, false);
		await flushPromises();
		expect(calls("DeletePlanDraft")).toEqual([
			[
				"DeletePlanDraft",
				{ planUuid: "p-1", draftUpdatedAt: U1 },
				undefined,
			],
		]);

		// undo then redo writes again
		await s.edit(2);
		expect(calls("SavePlanDraft")).toHaveLength(2);
		expect(calls("SavePlanDraft")[1][1].data.draft_updated_at).toBeNull();
	});

	it("sends nothing for a shared, new or previewed plan", async () => {
		const s = await setup({ enabled: false });
		await s.edit(2);
		expect(m.query).not.toHaveBeenCalled();
		expect(s.result.draftPending.value).toBe(false);
	});

	it("takes its own write back silently after a lost answer", async () => {
		const s = await setup();
		answers.SavePlanDraft = () => {
			throw conflictError();
		};
		// the stored draft is the one this tab sent
		answers.GetPlanDraft = () => draftOf(2, OTHER);
		await s.edit(2);
		expect(s.ask).not.toHaveBeenCalled();
		expect(s.result.draftFailed.value).toBe(false);

		answers.SavePlanDraft = () => U2;
		await s.edit(3);
		expect(calls("SavePlanDraft").at(-1)![1].data.draft_updated_at).toBe(
			OTHER
		);
	});

	it("resends the edits when the other draft is gone meanwhile", async () => {
		const s = await setup();
		let first = true;
		answers.SavePlanDraft = () => {
			if (first) {
				first = false;
				throw conflictError();
			}
			return U2;
		};
		answers.GetPlanDraft = () => null;
		await s.edit(2);
		expect(calls("SavePlanDraft")).toHaveLength(2);
		expect(calls("SavePlanDraft")[1][1].data.draft_updated_at).toBeNull();
		expect(s.ask).not.toHaveBeenCalled();
	});

	it("stops and asks on another tab's draft, keeps mine on overwrite", async () => {
		const s = await setup();
		answers.SavePlanDraft = () => {
			throw conflictError();
		};
		answers.GetPlanDraft = () => draftOf(9, OTHER);
		let choose: (option: string | null) => void = () => {};
		s.ask.mockImplementation(
			() => new Promise((resolve) => (choose = resolve))
		);
		await s.edit(2);

		expect(s.ask).toHaveBeenCalledWith(
			expect.objectContaining({
				variant: "draft",
				options: ["overwrite", "reload"],
			})
		);
		expect(s.result.draftFailed.value).toBe(true);
		// stopped: no writes on later edits
		await s.edit(3);
		expect(calls("SavePlanDraft")).toHaveLength(1);

		answers.SavePlanDraft = () => U2;
		choose("overwrite");
		await flushPromises();
		const last = calls("SavePlanDraft").at(-1)![1].data;
		expect(last).toMatchObject({
			plan_data: { n: 3 },
			draft_updated_at: OTHER,
		});
		expect(s.result.draftFailed.value).toBe(false);
	});

	it("loads the other draft on reload", async () => {
		const s = await setup();
		answers.SavePlanDraft = () => {
			throw conflictError();
		};
		answers.GetPlanDraft = () => draftOf(9, OTHER);
		s.ask.mockResolvedValue("reload");
		await s.edit(2);

		expect(s.applyDraft).toHaveBeenCalledWith(draftOf(9, OTHER));
		expect(s.result.draftResumed.value).toBe(true);
		expect(s.result.draftFailed.value).toBe(false);
	});

	it("doesn't ask again for a dismissed draft, but on a retry", async () => {
		const s = await setup();
		answers.SavePlanDraft = () => {
			throw conflictError();
		};
		answers.GetPlanDraft = () => draftOf(9, OTHER);
		s.ask.mockResolvedValue(null);
		await s.edit(2);
		expect(s.ask).toHaveBeenCalledTimes(1);

		await s.edit(3);
		expect(s.ask).toHaveBeenCalledTimes(1);
		expect(s.result.draftFailed.value).toBe(true);

		await s.result.retry();
		await flushPromises();
		expect(s.ask).toHaveBeenCalledTimes(2);
	});

	it("discards: nothing to delete, deleted, or another draft asks", async () => {
		const s = await setup();
		expect(await s.result.discard()).toBe("ok");
		expect(calls("DeletePlanDraft")).toHaveLength(0);

		await s.edit(2);
		expect(await s.result.discard()).toBe("ok");
		expect(calls("DeletePlanDraft")[0][1].draftUpdatedAt).toBe(U1);

		await s.edit(3);
		answers.DeletePlanDraft = () => {
			throw conflictError();
		};
		answers.GetPlanDraft = () => draftOf(9, OTHER);
		s.ask.mockResolvedValue(null);
		expect(await s.result.discard()).toBe("conflict");
		expect(s.ask).toHaveBeenCalledWith(
			expect.objectContaining({ variant: "draft" })
		);

		// stopped: the other draft is left alone
		expect(await s.result.discard()).toBe("ok");
		expect(calls("DeletePlanDraft")).toHaveLength(2);
	});

	it("drops the draft without asking after a reload", async () => {
		const s = await setup();
		await s.edit(2);
		answers.DeletePlanDraft = () => {
			throw conflictError();
		};
		await s.result.drop();
		expect(calls("DeletePlanDraft")).toHaveLength(1);
		expect(s.ask).not.toHaveBeenCalled();
	});

	it("runs a save after the write in flight, with the draft it saw", async () => {
		const s = await setup();
		let answer: (value: string) => void = () => {};
		answers.SavePlanDraft = () =>
			new Promise<string>((resolve) => (answer = resolve));
		await s.edit(2);

		const save = vi.fn(async (seen: string | null) => {
			s.result.saved();
			return seen;
		});
		const saving = s.result.withSave(save);
		await flushPromises();
		expect(save).not.toHaveBeenCalled();

		answer(U1);
		expect(await saving).toBe(U1);
		// the saved draft is gone with the save
		s.saved.value = JSON.stringify(s.state.value);
		await s.edit(3);
		expect(
			calls("SavePlanDraft").at(-1)![1].data.draft_updated_at
		).toBeNull();
	});

	it("keeps autosave stopped after a save that left the other draft", async () => {
		const s = await setup();
		answers.SavePlanDraft = () => {
			throw conflictError();
		};
		answers.GetPlanDraft = () => draftOf(9, OTHER);
		s.ask.mockResolvedValue(null);
		await s.edit(2);

		await s.result.withSave(async () => s.result.saved());
		s.saved.value = JSON.stringify(s.state.value);
		await s.edit(3);
		expect(calls("SavePlanDraft")).toHaveLength(1);
		expect(s.ask).toHaveBeenCalledTimes(1);
	});

	/** hides the page: visibilitychange to hidden, then visible again */
	function hide() {
		Object.defineProperty(document, "visibilityState", {
			value: "hidden",
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));
		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});
	}

	it("flushes a pending write with a keepalive request when hidden", async () => {
		const s = await setup();
		await s.edit(2, false);
		hide();

		expect(m.keepalive).toHaveBeenCalledWith(
			"p-1",
			expect.objectContaining({ draft_updated_at: null }),
			"tok"
		);
		// pending until it answers: the leave warning still asks
		expect(s.result.draftPending.value).toBe(true);
		vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
		await flushPromises();
		expect(calls("SavePlanDraft")).toHaveLength(0);

		// its answer never came: the next write meets it as ours and resends
		let first = true;
		answers.SavePlanDraft = () => {
			if (!first) return U2;
			first = false;
			throw conflictError();
		};
		answers.GetPlanDraft = () => draftOf(2, OTHER);
		await s.edit(3);
		expect(s.ask).not.toHaveBeenCalled();
		expect(calls("SavePlanDraft").at(-1)![1].data).toMatchObject({
			plan_data: { n: 3 },
			draft_updated_at: OTHER,
		});
	});

	it("takes the keepalive's answer while the page lives on", async () => {
		const s = await setup();
		m.keepalive.mockResolvedValue(OTHER);
		await s.edit(2, false);
		hide();
		await flushPromises();

		expect(s.result.draftPending.value).toBe(false);
		expect(s.result.draftSavedAt.value).toEqual(new Date(OTHER));
		answers.SavePlanDraft = () => U2;
		await s.edit(3);
		expect(calls("SavePlanDraft")[0][1].data.draft_updated_at).toBe(OTHER);
		expect(calls("GetPlanDraft")).toHaveLength(0);
	});

	it("writes again the normal way when the keepalive didn't store it", async () => {
		const s = await setup();
		// e.g. a 401: the keepalive can't refresh the token, axios can
		m.keepalive.mockResolvedValue(null);
		await s.edit(2, false);
		hide();
		await flushPromises();

		expect(calls("SavePlanDraft")).toHaveLength(1);
		expect(s.result.draftPending.value).toBe(false);
		expect(s.result.draftSavedAt.value).toEqual(new Date(U1));
	});

	it("skips the keepalive with an expired token and writes the normal way", async () => {
		const s = await setup();
		useUserStore().$patch({ accessToken: jwt(Date.now() - 1_000) });
		await s.edit(2, false);
		hide();
		await flushPromises();

		expect(m.keepalive).not.toHaveBeenCalled();
		expect(calls("SavePlanDraft")).toHaveLength(1);
	});

	it("refreshes a token about to expire when an edit arms the write", async () => {
		const s = await setup();
		const store = useUserStore();
		const refresh = vi
			.spyOn(store, "performTokenRefresh")
			.mockResolvedValue(true);
		store.$patch({ accessToken: jwt(Date.now() + 10 * 60_000) });
		await s.edit(2, false);
		expect(refresh).not.toHaveBeenCalled();

		store.$patch({ accessToken: jwt(Date.now() + 30_000) });
		await s.edit(3, false);
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it("leaves an overtaken keepalive's answer to the later write", async () => {
		const s = await setup();
		const answers1: ((v: string | null) => void)[] = [];
		m.keepalive.mockImplementation(
			() => new Promise<string | null>((r) => answers1.push(r))
		);
		await s.edit(2, false);
		hide();
		await s.edit(3, false);
		hide();
		expect(m.keepalive).toHaveBeenCalledTimes(2);

		// the first is stored, the second meets it (409: null)
		answers.SavePlanDraft = () => U2;
		answers1[0](OTHER);
		await flushPromises();
		expect(calls("SavePlanDraft")).toHaveLength(0);
		answers1[1](null);
		await flushPromises();

		// rewritten on top of the first, the newest edits go out
		expect(calls("GetPlanDraft")).toHaveLength(0);
		expect(s.ask).not.toHaveBeenCalled();
		expect(calls("SavePlanDraft").at(-1)![1].data).toMatchObject({
			plan_data: { n: 3 },
			draft_updated_at: OTHER,
		});
		expect(s.result.draftPending.value).toBe(false);
	});

	it("rewrites when a keepalive meets the write sent before it", async () => {
		const s = await setup();
		let answer: (value: string) => void = () => {};
		answers.SavePlanDraft = () =>
			new Promise<string>((resolve) => (answer = resolve));
		let keepaliveAnswer: (v: string | null) => void = () => {};
		m.keepalive.mockReturnValue(
			new Promise<string | null>((r) => (keepaliveAnswer = r))
		);
		// a write in flight, then an edit and a hide before it answers
		await s.edit(2);
		await s.edit(3, false);
		hide();

		answer(U1);
		await flushPromises();
		answers.SavePlanDraft = () => U2;
		// the keepalive met that write: 409, null
		keepaliveAnswer(null);
		await flushPromises();

		expect(calls("SavePlanDraft").at(-1)![1].data).toMatchObject({
			plan_data: { n: 3 },
			draft_updated_at: U1,
		});
		expect(s.result.draftPending.value).toBe(false);
		expect(s.ask).not.toHaveBeenCalled();
	});

	it("takes its own keepalive draft whose answer lands during a 409's check", async () => {
		const s = await setup();
		await s.edit(2);
		// seen: U1. A keepalive stored as U2, its answer slow
		let keepaliveAnswer: (v: string | null) => void = () => {};
		m.keepalive.mockReturnValue(
			new Promise<string | null>((r) => (keepaliveAnswer = r))
		);
		await s.edit(3, false);
		hide();

		// back, an edit: its write meets the keepalive's draft (409)
		let first = true;
		answers.SavePlanDraft = () => {
			if (!first) return OTHER;
			first = false;
			throw conflictError();
		};
		let draftAnswer: (d: PlanDraft) => void = () => {};
		answers.GetPlanDraft = () =>
			new Promise<PlanDraft>((r) => (draftAnswer = r));
		await s.edit(4);
		expect(calls("GetPlanDraft")).toHaveLength(1);

		// the keepalive answers while the 409's check reads the draft
		keepaliveAnswer(U2);
		await flushPromises();
		draftAnswer(draftOf(3, U2));
		await flushPromises();

		expect(s.ask).not.toHaveBeenCalled();
		expect(calls("SavePlanDraft").at(-1)![1].data).toMatchObject({
			plan_data: { n: 4 },
			draft_updated_at: U2,
		});
	});

	it("doesn't wait for a hanging keepalive before a preview", async () => {
		const s = await setup();
		await s.edit(2, false);
		hide();
		const waiting = s.result.writeNow();
		await vi.advanceTimersByTimeAsync(3_000);
		await expect(waiting).resolves.toBeUndefined();
	});

	it("waits for queued writes and a keepalive's rewrite before a preview", async () => {
		const s = await setup();
		let answer: (value: string) => void = () => {};
		answers.SavePlanDraft = () =>
			new Promise<string>((resolve) => (answer = resolve));
		await s.edit(2);
		await s.edit(3, false);

		let done = false;
		const flushing = s.result.writeNow().then(() => (done = true));
		await flushPromises();
		expect(done).toBe(false);
		answer(U1);
		await flushPromises();
		answer(U2);
		await flushing;
		expect(calls("SavePlanDraft")).toHaveLength(2);

		// a keepalive that wasn't stored: its rewrite is waited for too
		answers.SavePlanDraft = () => U1;
		let keepaliveAnswer: (v: string | null) => void = () => {};
		m.keepalive.mockReturnValue(
			new Promise<string | null>((r) => (keepaliveAnswer = r))
		);
		await s.edit(4, false);
		hide();
		const waiting = s.result.writeNow();
		keepaliveAnswer(null);
		await waiting;
		expect(calls("SavePlanDraft")).toHaveLength(3);
		expect(calls("SavePlanDraft")[2][1].data.plan_data).toEqual({ n: 4 });
	});

	it("takes its own keepalive draft before a save, a discard or an undo", async () => {
		answers.GetPlanDraft = () => draftOf(2, OTHER);

		// save: waits for the answer, reads the draft, sends its updated_at
		const s = await setup();
		await s.edit(2, false);
		hide();
		const saving = s.result.withSave(async (d) => d);
		await vi.advanceTimersByTimeAsync(3_000);
		expect(await saving).toBe(OTHER);

		// discard: deletes it, no dialog
		const d = await setup();
		await d.edit(2, false);
		hide();
		const discarding = d.result.discard();
		await vi.advanceTimersByTimeAsync(3_000);
		expect(await discarding).toBe("ok");
		expect(calls("DeletePlanDraft").at(-1)![1].draftUpdatedAt).toBe(OTHER);
		expect(d.ask).not.toHaveBeenCalled();

		// undone to the saved state: deleted too
		const u = await setup();
		await u.edit(2, false);
		hide();
		await u.edit(1, false);
		await vi.advanceTimersByTimeAsync(3_000);
		expect(calls("DeletePlanDraft")).toHaveLength(2);
	});

	it("saves with the keepalive's answer as soon as it arrives", async () => {
		const s = await setup();
		let answer: (value: string) => void = () => {};
		m.keepalive.mockReturnValue(
			new Promise<string>((resolve) => (answer = resolve))
		);
		await s.edit(2, false);
		hide();
		const saving = s.result.withSave(async (d) => d);
		answer(OTHER);
		expect(await saving).toBe(OTHER);
		expect(calls("GetPlanDraft")).toHaveLength(0);
	});

	it("sends a pending write at once before a preview", async () => {
		const s = await setup();
		s.result.writeNow();
		await flushPromises();
		expect(calls("SavePlanDraft")).toHaveLength(0);

		await s.edit(2, false);
		s.result.writeNow();
		await flushPromises();
		expect(calls("SavePlanDraft")).toHaveLength(1);
		expect(s.result.draftPending.value).toBe(false);
	});

	it("stays pending when the body is over the keepalive cap", async () => {
		const s = await setup();
		m.keepalive.mockReturnValue(false);
		await s.edit(2, false);
		window.dispatchEvent(new Event("pagehide"));
		expect(s.result.draftPending.value).toBe(true);
	});

	it("writes a pending draft on unmount", async () => {
		const s = await setup();
		await s.edit(2, false);
		s.wrapper.unmount();
		await flushPromises();
		expect(calls("SavePlanDraft")).toHaveLength(1);
	});

	it("applies a draft of the same save on load, refreshing the plan first", async () => {
		const s = await setup();
		answers.GetPlanDraft = () => draftOf(5, U1);
		const refresh = vi.fn(async () => {});
		const loaded = await s.result.load(refresh);

		expect(refresh).toHaveBeenCalled();
		expect(loaded).toEqual(draftOf(5, U1));
		expect(s.applyDraft).toHaveBeenCalled();
		expect(s.result.draftResumed.value).toBe(true);
		// applying schedules no write
		vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
		await flushPromises();
		expect(calls("SavePlanDraft")).toHaveLength(0);
	});

	it("drops a draft equal to the saved plan on load, without asking", async () => {
		const s = await setup({ base: "b1" });
		// left behind a save: same content, an older base
		answers.GetPlanDraft = () => draftOf(1, U1, "b0");
		expect(await s.result.load(async () => {})).toBeNull();
		await flushPromises();

		expect(s.ask).not.toHaveBeenCalled();
		expect(s.applyDraft).not.toHaveBeenCalled();
		expect(calls("DeletePlanDraft")[0][1].draftUpdatedAt).toBe(U1);
		expect(s.result.draftFailed.value).toBe(false);
	});

	it("loads nothing without a draft, and doesn't refresh", async () => {
		const s = await setup();
		answers.GetPlanDraft = () => null;
		const refresh = vi.fn(async () => {});
		expect(await s.result.load(refresh)).toBeNull();
		expect(refresh).not.toHaveBeenCalled();
	});

	it("asks about a draft of an older save: keep it or use the saved one", async () => {
		const s = await setup({ base: "b1" });
		answers.GetPlanDraft = () => draftOf(5, U1, "b0");
		s.ask.mockResolvedValueOnce("overwrite");
		expect(await s.result.load(async () => {})).toBeNull();
		expect(s.ask).toHaveBeenCalledWith(
			expect.objectContaining({ variant: "draft_base" })
		);
		await flushPromises();
		expect(s.applyDraft).toHaveBeenCalled();
		expect(calls("SavePlanDraft")[0][1].data).toMatchObject({
			base_modified_at: "b1",
			draft_updated_at: U1,
		});

		const other = await setup({ base: "b1" });
		other.ask.mockResolvedValueOnce("reload");
		await other.result.load(async () => {});
		await flushPromises();
		expect(calls("DeletePlanDraft")[0][1].draftUpdatedAt).toBe(U1);
	});

	it("leaves an older save's draft alone when the dialog is closed", async () => {
		const s = await setup({ base: "b1" });
		answers.GetPlanDraft = () => draftOf(5, U1, "b0");
		s.ask.mockResolvedValueOnce(null);
		await s.result.load(async () => {});
		expect(s.applyDraft).not.toHaveBeenCalled();
		await s.edit(2);
		expect(calls("SavePlanDraft")).toHaveLength(0);
		expect(s.result.draftFailed.value).toBe(true);
	});
});
