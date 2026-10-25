import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import PlanCalcDebug from "@/features/planning/components/debug/PlanCalcDebug.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { ITraceEntry } from "@/features/planning/engine/engine.types";
import type { IPlanTraceRun } from "@/features/planning/usePlanCalculation.types";
import type { ICalcDebugReport } from "@/features/planning/calcDebug.types";

const { trackEvent, setCalcDebug, checks } = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	setCalcDebug: vi.fn(),
	checks: { report: { checks: [], warnings: [] } as ICalcDebugReport },
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));
vi.mock("@/lib/debugMode", () => ({ setCalcDebug }));
vi.mock("@/features/planning/calcDebug.util", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@/features/planning/calcDebug.util")
	>()),
	calcDebugChecks: () => checks.report,
}));

let id = 0;
function entry(e: Partial<ITraceEntry>): ITraceEntry {
	return {
		id: id++,
		parent: null,
		phase: "input",
		label: "x",
		level: "info",
		...e,
	};
}

function traceRun(): IPlanTraceRun {
	id = 0;
	const group = entry({ phase: "production", label: "FRM × 2" });
	return {
		calculation: {} as IPlanTraceRun["calculation"],
		entries: [
			entry({
				phase: "input",
				label: "plan input",
				inputs: { cogc: "---" },
			}),
			group,
			entry({
				parent: group.id,
				phase: "production",
				label: "FRM#1 time",
				formula: "time_ms × amount",
				inputs: { time_ms: 1000, amount: 2 },
				value: 2000,
				unit: "ms",
				scope: { building: "FRM" },
			}),
			entry({
				phase: "production",
				label: "HB1 note",
				scope: { building: "HB1" },
			}),
			entry({
				phase: "prices",
				label: "RAT BUY",
				value: 0,
				level: "warn",
				note: "price is 0",
				scope: { ticker: "RAT" },
			}),
		],
		truncated: false,
		ms: 3.14,
		at: Date.UTC(2026, 9, 18, 12, 4, 31),
	};
}

const traceCalculation = vi.fn(traceRun);

const PLAN = {
	uuid: "00000000-0000-4000-8000-000000000001",
	plan_name: "Farm",
	planet_natural_id: "KW-688c",
	plan_permits_used: 1,
	plan_corphq: false,
	plan_cogc: "---",
	plan_data: {
		experts: [],
		buildings: [],
		workforce: [],
		infrastructure: [],
	},
	modified_at: "2026-10-18T12:00:00Z",
};

async function mountPanel(props: Record<string, unknown> = {}) {
	const mounted = await mountComponent(
		PlanCalcDebug,
		{
			show: true,
			traceCalculation,
			result: { done: true },
			overview: { profit: 1 },
			meta: {
				plan: "Farm",
				planet: "KW-688c",
				cx: "Universe",
				empire: "none",
			},
			plan: PLAN,
			modified: false,
			...props,
		},
		{ attach: true }
	);
	await flushPromises();
	return mounted;
}

const lines = (w: VueWrapper) => w.findAll("[data-line]").map((l) => l.text());
const button = (w: VueWrapper, text: string) =>
	w.findAll("button").find((b) => b.text().trim() === text)!;
const sectionButtons = (w: VueWrapper) => w.findAll("[data-phase] > button");
async function expandAll(w: VueWrapper) {
	for (const b of sectionButtons(w)) await b.trigger("click");
}

describe("PlanCalcDebug", () => {
	beforeEach(() => {
		traceCalculation.mockClear();
		trackEvent.mockClear();
		setCalcDebug.mockClear();
		checks.report = {
			checks: [
				{ name: "ok check", pass: true },
				{
					name: "broken check",
					pass: false,
					expected: 1,
					actual: 2,
					difference: 1,
				},
			],
			warnings: ["RAT BUY: price is 0"],
		};
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
			setTimeout(() => cb(0), 0)
		);
	});

	it("shows the status, checks and steps with filled formulas", async () => {
		const { wrapper: w } = await mountPanel();

		expect(w.find("[data-status]").text()).toMatch(
			/recalculated \d\d:\d\d:\d\d · 3\.1 ms · 5 steps · 1\/2 checks ✗/
		);
		expect(w.find("[data-checks]").text()).toContain("✓ ok check");
		expect(w.find("[data-checks]").text()).toContain(
			"✗ broken check: expected 1, actual 2, difference 1"
		);
		// sections start collapsed
		expect(lines(w)).toEqual([]);
		expect(
			sectionButtons(w).map((b) => b.attributes("aria-expanded"))
		).toEqual(["false", "false", "false"]);
		expect(sectionButtons(w)[1].text()).toBe("▸ production (3)");

		await expandAll(w);
		expect(lines(w).join("\n")).toContain("FRM#1 time");
		expect(lines(w).join("\n")).toContain("= 1,000 × 2");
		expect(lines(w).join("\n")).toContain("⚠ RAT BUY");
		expect(lines(w).join("\n")).toContain("cogc ---");
	});

	it("collapses phases and groups", async () => {
		const { wrapper: w } = await mountPanel();
		const section = w.find('[data-phase="production"] > button');
		expect(section.attributes("aria-expanded")).toBe("false");
		await section.trigger("click");
		expect(section.attributes("aria-expanded")).toBe("true");

		const group = w
			.findAll("[data-line] button")
			.find((b) => b.text().includes("FRM × 2"))!;
		await group.trigger("click");
		expect(lines(w).join("\n")).not.toContain("FRM#1 time");
		expect(group.attributes("aria-expanded")).toBe("false");

		await section.trigger("click");
		expect(section.attributes("aria-expanded")).toBe("false");
		expect(lines(w).join("\n")).not.toContain("FRM × 2");
	});

	it("filters by building, ticker or label and by phase chip", async () => {
		const { wrapper: w } = await mountPanel();

		await w.find("input").setValue("frm");
		// open while searching, the toggles wait until the search is cleared
		expect(
			sectionButtons(w).every(
				(b) => b.attributes("disabled") !== undefined
			)
		).toBe(true);
		expect(lines(w)).toHaveLength(2);
		expect(lines(w)[0]).toContain("FRM × 2");
		expect(lines(w)[1]).toContain("FRM#1 time");
		expect(lines(w).join("\n")).not.toContain("HB1");

		await w.find("input").setValue("rat");
		expect(lines(w)).toHaveLength(1);

		await w.find("input").setValue("nothing");
		expect(w.text()).toContain("No steps match.");

		await w.find("input").setValue("");
		await button(w, "prices").trigger("click");
		expect(w.find('[data-phase="prices"]').exists()).toBe(false);
		await button(w, "prices").trigger("click");
		expect(w.find('[data-phase="prices"]').exists()).toBe(true);
	});

	it("shows only warnings and failed checks with Issues only", async () => {
		const { wrapper: w } = await mountPanel();
		await button(w, "Issues only").trigger("click");

		expect(lines(w)).toHaveLength(1);
		expect(lines(w)[0]).toContain("RAT BUY");
		expect(w.find("[data-checks]").text()).not.toContain("ok check");
		expect(w.find("[data-checks]").text()).toContain("broken check");
	});

	it("copies text and JSON with the meta header", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("navigator", { clipboard: { writeText } });
		const { wrapper: w } = await mountPanel();

		await button(w, "Copy text").trigger("click");
		await flushPromises();
		const text = writeText.mock.calls[0][0] as string;
		expect(text).toContain("plan: Farm");
		expect(text).toContain("planet: KW-688c");
		expect(text).toContain("build: dev");
		expect(text).toContain("FRM#1 time = 2,000 ms");
		expect(text).toContain('    "plan_name": "Farm",');

		await button(w, "Copy JSON").trigger("click");
		await flushPromises();
		const json = JSON.parse(writeText.mock.calls[1][0]);
		expect(json.meta.plan).toBe("Farm");
		expect(json.plan).toEqual(PLAN);
		expect(json.entries).toHaveLength(5);
		expect(json.checks).toHaveLength(2);
	});

	it("says so when the clipboard is blocked", async () => {
		vi.stubGlobal("navigator", {
			clipboard: {
				writeText: vi.fn().mockRejectedValue(new Error("no")),
			},
		});
		const { wrapper: w } = await mountPanel();

		await button(w, "Copy text").trigger("click");
		await flushPromises();
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("retraces when the plan's result changes, once per frame", async () => {
		const { setProps } = await mountPanel();
		expect(traceCalculation).toHaveBeenCalledTimes(1);

		// result and overview change together: one rerun
		await setProps({
			result: { done: true, profit: 2 },
			overview: { profit: 3 },
		});
		await vi.waitFor(() =>
			expect(traceCalculation).toHaveBeenCalledTimes(2)
		);
	});

	it("keeps the last trace and shows the error when a run fails", async () => {
		const { wrapper: w, setProps } = await mountPanel();
		traceCalculation.mockImplementationOnce(() => {
			throw new Error("Material XYZ not available.");
		});

		await setProps({ result: { done: true, profit: 5 } });
		await vi.waitFor(() =>
			expect(w.find("[data-status]").text()).toBe(
				"calculation failed: Material XYZ not available."
			)
		);
		await expandAll(w);
		expect(lines(w).join("\n")).toContain("FRM#1 time");
	});

	it("shows the plan as stored, collapsed, with its save state", async () => {
		const { wrapper: w, setProps } = await mountPanel();
		const header = () => w.find("[data-plan] > button");

		expect(header().text()).toBe("▸ plan · saved 2026-10-18T12:00:00Z");
		expect(header().attributes("aria-expanded")).toBe("false");
		expect(w.find("[data-plan] pre").exists()).toBe(false);

		await header().trigger("click");
		expect(JSON.parse(w.find("[data-plan] pre").text())).toEqual(PLAN);

		await setProps({ modified: true });
		expect(header().text()).toBe(
			"▾ plan · saved 2026-10-18T12:00:00Z · unsaved edits"
		);
		await setProps({ plan: { ...PLAN, uuid: undefined } });
		expect(header().text()).toBe("▾ plan · never saved · unsaved edits");

		await button(w, "Issues only").trigger("click");
		expect(w.find("[data-plan]").exists()).toBe(false);
	});

	it("turns debug off and closes", async () => {
		const { wrapper: w, component } = await mountPanel();

		await button(w, "Turn off").trigger("click");
		expect(setCalcDebug).toHaveBeenCalledWith(false);

		await w.find('[aria-label="common.ui.close"]').trigger("click");
		expect(component.emitted("update:show")?.[0]).toEqual([false]);
	});

	it("resizes by dragging the grip and with the arrow keys", async () => {
		const { wrapper: w } = await mountPanel();
		const grip = w.find("[role=separator]");
		// jsdom has no PointerEvent: a mouse event under the pointer name
		const pointer = async (type: string, clientY = 0) => {
			grip.element.dispatchEvent(
				new MouseEvent(type, { clientY, bubbles: true })
			);
			await flushPromises();
		};
		const height = () => Number(grip.attributes("aria-valuenow"));
		const start = height();

		await pointer("pointerdown", 500);
		await pointer("pointermove", 450);
		expect(height()).toBe(start + 50);

		await pointer("pointerup");
		await pointer("pointermove", 300);
		expect(height()).toBe(start + 50);

		// a cancelled drag ends like a released one
		await pointer("pointerdown", 500);
		await pointer("pointercancel");
		await pointer("pointermove", 300);
		expect(height()).toBe(start + 50);

		await grip.trigger("keydown", { key: "ArrowUp" });
		expect(height()).toBe(start + 50 + 24);
		await grip.trigger("keydown", { key: "ArrowDown" });
		await grip.trigger("keydown", { key: "ArrowDown" });
		expect(height()).toBe(start + 50 - 24);
	});

	it("closes on Escape", async () => {
		const { component } = await mountPanel();

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await flushPromises();

		expect(component.emitted("update:show")?.[0]).toEqual([false]);
	});

	it("waits for the plan and can't copy before there is a trace", async () => {
		traceCalculation.mockReturnValueOnce(undefined as never);
		const { wrapper: w } = await mountPanel();

		expect(w.find("[data-status]").text()).toBe("waiting for the plan…");
		expect(button(w, "Copy text").attributes("disabled")).toBeDefined();
		expect(button(w, "Copy JSON").attributes("disabled")).toBeDefined();
		expect(w.find("[data-phase]").exists()).toBe(false);
		expect(w.text()).not.toContain("No steps match.");
	});

	it("marks a truncated trace and all checks passing", async () => {
		checks.report = {
			checks: [{ name: "ok check", pass: true }],
			warnings: [],
		};
		traceCalculation.mockReturnValueOnce({
			...traceRun(),
			truncated: true,
		});
		const { wrapper: w } = await mountPanel();

		expect(w.find("[data-status]").text()).toMatch(
			/5 steps \(truncated\) · 1\/1 checks ✓$/
		);
		expect(w.find("[data-status]").classes()).toContain("text-muted");
		expect(w.find("[data-status]").classes()).not.toContain(
			"text-negative"
		);
	});

	it("shows a failing check in red and a thrown non-error as text", async () => {
		const { wrapper: w, setProps } = await mountPanel();
		expect(w.find("[data-status]").classes()).toContain("text-negative");

		traceCalculation.mockImplementationOnce(() => {
			throw "out of memory";
		});
		await setProps({ result: { done: true, profit: 9 } });
		await vi.waitFor(() =>
			expect(w.find("[data-status]").text()).toBe(
				"calculation failed: out of memory"
			)
		);
	});

	it("reruns once for changes within a frame and drops a pending one on close", async () => {
		const frames: FrameRequestCallback[] = [];
		const cancel = vi.fn();
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push(cb);
			return frames.length;
		});
		vi.stubGlobal("cancelAnimationFrame", cancel);
		const { wrapper: w, setProps } = await mountPanel();

		await setProps({ result: { done: true, profit: 2 } });
		await setProps({ overview: { profit: 5 } });
		expect(frames).toHaveLength(1);
		expect(traceCalculation).toHaveBeenCalledTimes(1);

		frames[0](0);
		expect(traceCalculation).toHaveBeenCalledTimes(2);

		// a change right before closing leaves nothing running
		await setProps({ overview: { profit: 6 } });
		expect(frames).toHaveLength(2);
		w.unmount();
		expect(cancel).toHaveBeenCalledWith(2);
	});

	it("explains a step's formula, remaining inputs and note", async () => {
		const run = traceRun();
		run.entries.push(
			entry({
				phase: "input",
				label: "full step",
				formula: "a × b",
				inputs: { a: 2, b: 3, c: 4 },
				note: "rounded",
			}),
			entry({ phase: "input", label: "bare note", note: "only a note" })
		);
		traceCalculation.mockReturnValueOnce(run);
		const { wrapper: w } = await mountPanel();
		await sectionButtons(w)[0].trigger("click");

		const line = (label: string) =>
			w.findAll("[data-line]").find((l) => l.text().includes(label))!;
		expect(line("full step").text()).toContain("= 2 × 3 · c 4 · rounded");
		expect(line("bare note").text()).toContain("only a note");
		expect(line("bare note").text()).not.toContain("·");
	});

	it("shows a plan without a save version", async () => {
		const { wrapper: w } = await mountPanel({
			plan: { ...PLAN, modified_at: undefined },
		});

		expect(w.find("[data-plan] > button").text()).toBe(
			"▸ plan · saved (no version)"
		);
	});
});
