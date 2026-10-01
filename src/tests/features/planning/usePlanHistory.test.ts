import { nextTick, ref, type Ref, watch } from "vue";
import { describe, it, expect } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Composables
import { usePlanHistory } from "@/features/planning/usePlanHistory";

// Types & Interfaces
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";

function setup() {
	const plan: Ref<IPlanDefinition> = ref({
		uuid: "plan-1",
		plan_name: "Plan",
		planet_natural_id: "OT-580b",
		plan_permits_used: 1,
		plan_corphq: false,
		plan_cogc: "---",
		plan_data: {
			experts: [],
			workforce: [],
			infrastructure: [{ building: "HB1", amount: 0 }],
			buildings: [{ name: "PP1", amount: 1, active_recipes: [] }],
		},
		empires: [],
	} as unknown as IPlanDefinition);
	const planName: Ref<string | undefined> = ref("Plan");
	const history = usePlanHistory(plan, planName);

	const setAmount = history.record((value: number) => {
		plan.value.plan_data.buildings[0].amount = value;
	});
	const setHabs = history.record((value: number) => {
		plan.value.plan_data.infrastructure[0].amount = value;
	});
	const setName = history.record((value: string) => {
		planName.value = value;
	}, "plan_name");

	return { plan, planName, history, setAmount, setHabs, setName };
}

const amount = (plan: Ref<IPlanDefinition>) =>
	plan.value.plan_data.buildings[0].amount;

describe("usePlanHistory", () => {
	it("starts saved, without history", () => {
		const { history } = setup();

		expect(history.modified.value).toBe(false);
		expect(history.canUndo.value).toBe(false);
		expect(history.canRedo.value).toBe(false);
	});

	it("undoes several recipes added by one handler in one step", async () => {
		const { plan, history } = setup();
		const addRecipes = history.record(() => {
			plan.value.plan_data.buildings[0].active_recipes.push(
				{ recipeid: "a", amount: 2 },
				{ recipeid: "b", amount: 3 }
			);
		});

		addRecipes();
		await flushPromises();
		expect(plan.value.plan_data.buildings[0].active_recipes.length).toBe(2);

		history.undo();
		await flushPromises();
		expect(plan.value.plan_data.buildings[0].active_recipes).toStrictEqual(
			[]
		);
		expect(history.canUndo.value).toBe(false);
	});

	it("undoes and redoes an edit", async () => {
		const { plan, history, setAmount } = setup();

		setAmount(5);
		await flushPromises();
		expect(history.modified.value).toBe(true);
		expect(history.canUndo.value).toBe(true);

		history.undo();
		expect(amount(plan)).toBe(1);
		expect(history.modified.value).toBe(false);
		expect(history.canRedo.value).toBe(true);

		history.redo();
		expect(amount(plan)).toBe(5);
		expect(history.modified.value).toBe(true);
	});

	it("undoes several edits one by one back to the saved state", async () => {
		const { plan, history, setAmount, setHabs } = setup();

		for (let i = 2; i <= 6; i++) {
			setAmount(i);
			await flushPromises();
			setHabs(i);
			await flushPromises();
		}

		for (let i = 0; i < 10; i++) history.undo();
		expect(amount(plan)).toBe(1);
		expect(plan.value.plan_data.infrastructure[0].amount).toBe(0);
		expect(history.modified.value).toBe(false);
		expect(history.canUndo.value).toBe(false);

		for (let i = 0; i < 10; i++) history.redo();
		expect(amount(plan)).toBe(6);
		expect(plan.value.plan_data.infrastructure[0].amount).toBe(6);
	});

	it("keeps the last 50 steps", async () => {
		const { plan, history, setAmount } = setup();

		for (let i = 2; i <= 61; i++) {
			setAmount(i);
			await flushPromises();
		}
		while (history.canUndo.value) history.undo();

		// the oldest 10 steps are gone
		expect(amount(plan)).toBe(11);
	});

	it("leaves no step for an edit that changes nothing", async () => {
		const { history, setAmount } = setup();

		setAmount(1);
		await flushPromises();

		expect(history.canUndo.value).toBe(false);
	});

	it("groups follow-up edits of the same flush into one step", async () => {
		const { plan, history, setAmount, setHabs } = setup();
		// like hab auto-optimisation reacting to a workforce change
		watch(
			() => amount(plan),
			(value) => setHabs(value * 2)
		);

		setAmount(3);
		await flushPromises();
		expect(plan.value.plan_data.infrastructure[0].amount).toBe(6);

		history.undo();
		expect(amount(plan)).toBe(1);
		expect(plan.value.plan_data.infrastructure[0].amount).toBe(0);
		expect(history.canUndo.value).toBe(false);
	});

	it("records async handlers after they settle", async () => {
		const { plan, history } = setup();
		const addLater = history.record(async () => {
			await Promise.resolve();
			plan.value.plan_data.buildings.push({
				name: "FRM",
				amount: 1,
				active_recipes: [],
			});
		});

		await addLater();
		await flushPromises();
		expect(history.canUndo.value).toBe(true);

		history.undo();
		expect(plan.value.plan_data.buildings).toHaveLength(1);
	});

	it("merges typing a name into one step", async () => {
		const { planName, history, setName, setAmount } = setup();

		for (const name of ["N", "Ne", "New"]) {
			setName(name);
			await flushPromises();
		}
		history.undo();
		expect(planName.value).toBe("Plan");
		expect(history.canUndo.value).toBe(false);

		// another edit in between starts a new name step
		history.redo();
		setAmount(2);
		await flushPromises();
		setName("Newer");
		await flushPromises();
		history.undo();
		expect(planName.value).toBe("New");
	});

	it("treats a cleared name like no name", async () => {
		const { planName, history, setName } = setup();
		planName.value = undefined;
		history.markSaved();

		setName("Typed");
		await flushPromises();
		setName("");
		await flushPromises();

		expect(history.modified.value).toBe(false);
	});

	it("clears redo on a new edit", async () => {
		const { history, setAmount } = setup();

		setAmount(2);
		await flushPromises();
		history.undo();
		setAmount(3);
		await flushPromises();

		expect(history.canRedo.value).toBe(false);
	});

	it("clears the history when saved", async () => {
		const { history, setAmount } = setup();
		const loadedAt: Date = history.savedAt.value;

		setAmount(2);
		await flushPromises();
		history.markSaved();

		expect(history.modified.value).toBe(false);
		expect(history.canUndo.value).toBe(false);
		expect(history.savedAt.value).not.toBe(loadedAt);
	});

	it("keeps edits made while a save was in flight unsaved", async () => {
		const { history, setAmount } = setup();

		setAmount(2);
		await flushPromises();
		const sent: string = history.snapshot();
		setAmount(3);
		await flushPromises();
		history.markSaved(sent);

		expect(history.modified.value).toBe(true);
	});

	it("bumps the revision once per step, undo, redo and save", async () => {
		const { plan, history, setAmount, setHabs } = setup();
		watch(
			() => amount(plan),
			(value) => setHabs(value * 2)
		);
		const start: number = history.revision.value;

		// the watcher's follow-up edit joins the step, no extra bump
		setAmount(3);
		expect(history.revision.value).toBe(start + 1);
		await flushPromises();
		expect(history.revision.value).toBe(start + 1);

		history.undo();
		history.redo();
		history.markSaved();
		expect(history.revision.value).toBe(start + 4);
	});

	it("reports restoring until the next flush", async () => {
		const { history, setAmount } = setup();

		setAmount(2);
		await flushPromises();
		history.undo();
		expect(history.isRestoring()).toBe(true);

		await nextTick();
		expect(history.isRestoring()).toBe(false);
	});
});
