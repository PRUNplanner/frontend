import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Slots } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import ManageView from "@/views/ManageView.vue";
import ManageSaveBar from "@/features/manage/components/ManageSaveBar.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers
const { passThrough, fake, toast, guards } = vi.hoisted(() => {
	// the child editors have their own tests: these fakes expose the same
	// changedCount / changes, save() and discard() the view drives
	const fake = (name: string, state: Record<string, unknown>) => ({
		// defineAsyncComponent unwraps .default of ES modules only
		__esModule: true,
		default: {
			name,
			props: ["empires", "plans", "cx", "saved"],
			setup(_: unknown, { expose }: { expose: (e: object) => void }) {
				expose(state);
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
		guards: [] as (() => boolean | undefined)[],
	};
});

const state = vi.hoisted(() => ({
	empire: {} as {
		changedCount: number;
		save: ReturnType<typeof vi.fn>;
		discard: ReturnType<typeof vi.fn>;
	},
	matrix: {} as {
		changes: { changedCount: number; planCount: number; empireCount: number };
		save: ReturnType<typeof vi.fn>;
		discard: ReturnType<typeof vi.fn>;
	},
}));

vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () =>
	fake("HelpDrawer", {})
);
vi.mock("@/features/manage/components/ManageCX.vue", () =>
	fake("ManageCX", {})
);
vi.mock("@/features/manage/components/ManageEmpire.vue", async () => {
	const { reactive } = await import("vue");
	state.empire = reactive({
		changedCount: 0,
		save: vi.fn(),
		discard: vi.fn(),
	}) as typeof state.empire;
	return fake("ManageEmpire", state.empire);
});
vi.mock(
	"@/features/manage/components/ManagePlanEmpireAssignments.vue",
	async () => {
		const { reactive } = await import("vue");
		state.matrix = reactive({
			changes: { changedCount: 0, planCount: 0, empireCount: 0 },
			save: vi.fn(),
			discard: vi.fn(),
		}) as typeof state.matrix;
		return fake("ManagePlanEmpireAssignments", state.matrix);
	}
);
vi.mock("@/ui/useToast", () => ({ useToast: () => toast }));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	onBeforeRouteLeave: (guard: () => boolean | undefined) =>
		guards.push(guard),
}));

function setChanges(cx: number, matrix: number) {
	state.empire.changedCount = cx;
	state.matrix.changes.changedCount = matrix;
	state.matrix.changes.planCount = matrix;
	state.matrix.changes.empireCount = matrix > 0 ? 1 : 0;
}

const bar = (wrapper: VueWrapper) => wrapper.findComponent(ManageSaveBar);
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
			barButton(wrapper, "management.save_bar.save").attributes("aria-busy")
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
		expect(toast).toHaveBeenCalledWith("management.save_bar.error", {
			type: "error",
		});

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

		expect(guard()).toBeUndefined();
		expect(confirm).not.toHaveBeenCalled();

		setChanges(0, 1);
		await flushPromises();
		expect(guard()).toBe(false);
		expect(confirm).toHaveBeenCalledWith(
			"management.save_bar.leave_unsaved"
		);
		expect(add).toHaveBeenCalledWith("beforeunload", expect.any(Function));

		confirm.mockRestore();
		add.mockRestore();
	});
});
