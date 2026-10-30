import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import type { Slots } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import ManageView from "@/views/ManageView.vue";
import SaveBar from "@/features/save_bar/components/SaveBar.vue";
import { mountComponent } from "@/tests/mountComponent";
import type { IManageData } from "@/features/manage/useManageData.types";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers
const { passThrough, fake, toast, guards } = vi.hoisted(() => {
	// the child editors have their own tests: these fakes register the
	// same changedCount, detail, save() and discard() the view drives
	const fake = (name: string, onSetup: () => void = () => {}) => ({
		// defineAsyncComponent unwraps .default of ES modules only
		__esModule: true,
		default: {
			name,
			props: ["empires", "plans", "cx", "saved"],
			setup() {
				onSetup();
				return () => null;
			},
		},
	});
	return {
		passThrough: (name: string) => ({
			default: {
				name,
				setup:
					(_: unknown, { slots }: { slots: Slots }) =>
					() =>
						slots.default?.(),
			},
		}),
		fake,
		toast: vi.fn(),
		guards: [] as ((to: { fullPath: string }) => boolean | undefined)[],
	};
});

const state = vi.hoisted(() => ({
	empire: {} as {
		changedCount: number;
		save: Mock<() => Promise<void>>;
		discard: Mock<() => void>;
	},
	matrix: {} as {
		changes: {
			changedCount: number;
			planCount: number;
			empireCount: number;
		};
		save: Mock<() => Promise<void>>;
		discard: Mock<() => void>;
	},
	// what the sections inject
	data: undefined as IManageData | undefined,
}));

vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () =>
	fake("HelpDrawer")
);
vi.mock("@/features/manage/components/ManageCX.vue", async () => {
	const { useManageData } = await import("@/features/manage/useManageData");
	return fake("ManageCX", () => (state.data = useManageData()));
});
vi.mock("@/features/manage/components/ManageEmpire.vue", async () => {
	const { computed, reactive } = await import("vue");
	const { useManageData } = await import("@/features/manage/useManageData");
	state.empire = reactive({
		changedCount: 0,
		save: vi.fn(),
		discard: vi.fn(),
	}) as typeof state.empire;
	return fake("ManageEmpire", () =>
		useManageData().register("empire", {
			changedCount: computed(() => state.empire.changedCount),
			save: () => state.empire.save(),
			discard: () => state.empire.discard(),
		})
	);
});
vi.mock(
	"@/features/manage/components/ManagePlanEmpireAssignments.vue",
	async () => {
		const { computed, reactive } = await import("vue");
		const { useManageData } = await import(
			"@/features/manage/useManageData"
		);
		state.matrix = reactive({
			changes: { changedCount: 0, planCount: 0, empireCount: 0 },
			save: vi.fn(),
			discard: vi.fn(),
		}) as typeof state.matrix;
		return fake("ManagePlanEmpireAssignments", () =>
			useManageData().register("assignments", {
				changedCount: computed(() => state.matrix.changes.changedCount),
				detail: computed(() =>
					state.matrix.changes.changedCount > 0
						? "management.assignments.plan_count"
						: undefined
				),
				save: () => state.matrix.save(),
				discard: () => state.matrix.discard(),
			})
		);
	}
);
vi.mock("@/ui/useToast", () => ({ useToast: () => toast }));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	onBeforeRouteLeave: (
		guard: (to: { fullPath: string }) => boolean | undefined
	) => guards.push(guard),
}));

function setChanges(cx: number, matrix: number) {
	state.empire.changedCount = cx;
	state.matrix.changes.changedCount = matrix;
	state.matrix.changes.planCount = matrix;
	state.matrix.changes.empireCount = matrix > 0 ? 1 : 0;
}

const bar = (wrapper: VueWrapper) => wrapper.findComponent(SaveBar);
const barButton = (wrapper: VueWrapper, label: string) =>
	bar(wrapper)
		.findAll("button")
		.find((b) => b.text() === label)!;

describe("ManageView", () => {
	beforeEach(() => {
		toast.mockClear();
		guards.length = 0;
	});

	async function mountView() {
		const mounted = await mountComponent(ManageView);
		// the fakes are created by the async imports
		setChanges(0, 0);
		state.empire.save.mockReset();
		state.matrix.save.mockReset();
		state.empire.discard.mockReset();
		state.matrix.discard.mockReset();
		await flushPromises();
		return mounted;
	}

	it("shows the bar only with unsaved changes, counting both editors", async () => {
		const { wrapper } = await mountView();
		expect(bar(wrapper).exists()).toBe(false);

		setChanges(1, 2);
		await flushPromises();
		expect(bar(wrapper).props("count")).toBe(3);
		expect(bar(wrapper).props("detail")).toBe(
			"management.assignments.plan_count"
		);
		expect(bar(wrapper).text()).toContain("management.save_bar.unsaved");
	});

	it("saves CX then plans, then hides the bar and shows saved", async () => {
		const { wrapper } = await mountView();
		const order: string[] = [];
		let finish: () => void = () => {};
		state.empire.save.mockImplementation(async () => {
			order.push("cx");
			state.empire.changedCount = 0;
		});
		state.matrix.save.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					order.push("plans");
					finish = () => {
						setChanges(0, 0);
						resolve();
					};
				})
		);
		setChanges(1, 2);
		await flushPromises();

		await barButton(wrapper, "management.save_bar.save").trigger("click");
		await flushPromises();

		// saving: spinner on save, discard disabled
		expect(bar(wrapper).props("state")).toBe("saving");
		expect(
			barButton(wrapper, "management.save_bar.save").attributes(
				"aria-busy"
			)
		).toBe("true");
		expect(
			barButton(wrapper, "management.save_bar.discard").attributes(
				"disabled"
			)
		).toBeDefined();

		// a second click while saving sends nothing again
		await barButton(wrapper, "management.save_bar.save").trigger("click");
		await flushPromises();

		finish();
		await flushPromises();
		expect(order).toEqual(["cx", "plans"]);
		expect(state.matrix.save).toHaveBeenCalledTimes(1);
		expect(bar(wrapper).exists()).toBe(false);
		expect(
			wrapper
				.findComponent({ name: "ManagePlanEmpireAssignments" })
				.props("saved")
		).toBe(true);
	});

	it("keeps the bar and edits on failure, retry skips the saved part", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountView();
		state.empire.save.mockImplementation(async () => {
			state.empire.changedCount = 0;
		});
		state.matrix.save.mockRejectedValue(new Error("500"));
		setChanges(1, 2);
		await flushPromises();

		await barButton(wrapper, "management.save_bar.save").trigger("click");
		await flushPromises();

		expect(bar(wrapper).props("state")).toBe("error");
		expect(bar(wrapper).props("count")).toBe(2);
		expect(bar(wrapper).text()).toContain("management.save_bar.error");
		expect(toast).not.toHaveBeenCalled();

		await barButton(wrapper, "management.save_bar.retry").trigger("click");
		await flushPromises();
		expect(state.empire.save).toHaveBeenCalledTimes(1);
		expect(state.matrix.save).toHaveBeenCalledTimes(2);
		error.mockRestore();
	});

	it("discards both editors", async () => {
		const { wrapper } = await mountView();
		setChanges(1, 1);
		await flushPromises();

		await barButton(wrapper, "management.save_bar.discard").trigger(
			"click"
		);
		expect(state.empire.discard).toHaveBeenCalled();
		expect(state.matrix.discard).toHaveBeenCalled();
	});

	it("guards leaving and closing the tab only while dirty", async () => {
		const add = vi.spyOn(window, "addEventListener");
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
		await mountView();
		const guard = guards.at(-1)!;
		const to = { fullPath: "/empire" };

		expect(guard(to)).toBeUndefined();
		expect(confirm).not.toHaveBeenCalled();

		setChanges(0, 1);
		await flushPromises();
		expect(guard(to)).toBe(false);
		expect(confirm).toHaveBeenCalledWith(
			"management.save_bar.leave_unsaved"
		);
		expect(add).toHaveBeenCalledWith("beforeunload", expect.any(Function));

		confirm.mockRestore();
		add.mockRestore();
	});

	it("saves only the editor that has changes", async () => {
		const { wrapper } = await mountView();
		state.empire.save.mockImplementation(async () => {
			state.empire.changedCount = 0;
		});
		setChanges(2, 0);
		await flushPromises();

		// no plan assignment change: no detail line
		expect(bar(wrapper).props("count")).toBe(2);
		expect(bar(wrapper).props("detail")).toBeUndefined();

		await barButton(wrapper, "management.save_bar.save").trigger("click");
		await flushPromises();

		expect(state.empire.save).toHaveBeenCalledTimes(1);
		expect(state.matrix.save).not.toHaveBeenCalled();
		expect(bar(wrapper).exists()).toBe(false);
	});

	it("shows saved for 4 seconds, a second save restarts that", async () => {
		const { wrapper } = await mountView();
		const saved = () =>
			wrapper
				.findComponent({ name: "ManagePlanEmpireAssignments" })
				.props("saved");
		state.empire.save.mockImplementation(async () => {
			state.empire.changedCount = 0;
		});
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

		try {
			for (const wait of [3000, 3000]) {
				setChanges(1, 0);
				await flushPromises();
				await barButton(wrapper, "management.save_bar.save").trigger(
					"click"
				);
				await flushPromises();
				expect(saved()).toBe(true);
				// the first timer would have run out by now
				vi.advanceTimersByTime(wait);
				await flushPromises();
				expect(saved()).toBe(true);
			}

			vi.advanceTimersByTime(1000);
			await flushPromises();
			expect(saved()).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("feeds the loaded lists to the editors and their reloads to all", async () => {
		const { wrapper } = await mountView();
		const loader = wrapper.findComponent({
			name: "WrapperPlanningDataLoader",
		});
		const empire = () => wrapper.findComponent({ name: "ManageEmpire" });
		const cx = () => wrapper.findComponent({ name: "ManageCX" });
		const matrix = () =>
			wrapper.findComponent({ name: "ManagePlanEmpireAssignments" });

		expect(empire().props("empires")).toEqual([]);
		expect(matrix().props("plans")).toEqual([]);

		loader.vm.$emit("data:cx", [{ uuid: "cx-1" }]);
		loader.vm.$emit("data:empire:list", [{ uuid: "e-1" }]);
		loader.vm.$emit("data:plan:list", [{ uuid: "p-1" }]);
		await flushPromises();

		expect(empire().props("cx")).toEqual([{ uuid: "cx-1" }]);
		expect(cx().props("cx")).toEqual([{ uuid: "cx-1" }]);
		expect(empire().props("empires")).toEqual([{ uuid: "e-1" }]);
		expect(matrix().props("empires")).toEqual([{ uuid: "e-1" }]);
		expect(matrix().props("plans")).toEqual([{ uuid: "p-1" }]);

		// a section's reload replaces the shared lists
		state.data!.cxList.value = [{ uuid: "cx-3" }] as CX[];
		state.data!.empireList.value = [
			{ uuid: "e-3" },
		] as PlanEmpireElement[];
		state.data!.planList.value = [{ uuid: "p-2" }] as Plan[];
		await flushPromises();

		expect(cx().props("cx")).toEqual([{ uuid: "cx-3" }]);
		expect(empire().props("cx")).toEqual([{ uuid: "cx-3" }]);
		expect(empire().props("empires")).toEqual([{ uuid: "e-3" }]);
		expect(matrix().props("plans")).toEqual([{ uuid: "p-2" }]);
	});
});
