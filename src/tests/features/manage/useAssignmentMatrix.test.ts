import { describe, it, expect } from "vitest";

// Composables
import {
	buildLoaded,
	cellKey,
	diff,
	rebase,
	setMany,
	toJunctions,
	useAssignmentMatrix,
} from "@/features/manage/useAssignmentMatrix";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

const planRef = (uuid: string) => ({
	uuid,
	plan_name: uuid,
	planet_natural_id: "ZV-307c",
});
const empire = (uuid: string, plans: string[]): PlanEmpireElement =>
	({
		uuid,
		empire_name: uuid,
		empire_faction: "NONE",
		empire_permits_used: 1,
		empire_permits_total: 2,
		plans: plans.map(planRef),
	}) as PlanEmpireElement;

const EMPIRES = [empire("E1", ["P1", "P2"]), empire("E2", ["P3"])];
const k = cellKey;

describe("useAssignmentMatrix", () => {
	it("buildLoaded collects every assigned cell", () => {
		expect(buildLoaded(EMPIRES)).toEqual(
			new Set([k("P1", "E1"), k("P2", "E1"), k("P3", "E2")])
		);
	});

	it("diff counts changed cells, plans and empires", () => {
		const loaded = buildLoaded(EMPIRES);
		const current = setMany(
			setMany(loaded, [k("P1", "E2"), k("P2", "E2")], true),
			[k("P1", "E1")],
			false
		);

		const d = diff(loaded, current);
		expect(d.changedCount).toBe(3);
		expect(d.planCount).toBe(2);
		expect(d.empireCount).toBe(2);
		expect(diff(loaded, loaded).changedCount).toBe(0);
	});

	it("toJunctions sends full lists only for changed empires", () => {
		const loaded = buildLoaded(EMPIRES);
		const current = setMany(loaded, [k("P3", "E1")], true);

		expect(
			toJunctions(EMPIRES, current, diff(loaded, current).changedKeys)
		).toEqual([
			{
				empire_uuid: "E1",
				baseplanners: [
					{ baseplanner_uuid: "P1" },
					{ baseplanner_uuid: "P2" },
					{ baseplanner_uuid: "P3" },
				],
			},
		]);
	});

	it("toJunctions sends an empty list for an emptied empire", () => {
		const loaded = buildLoaded(EMPIRES);
		const current = setMany(loaded, [k("P3", "E2")], false);

		expect(
			toJunctions(EMPIRES, current, diff(loaded, current).changedKeys)
		).toEqual([{ empire_uuid: "E2", baseplanners: [] }]);
	});

	it("setMany only touches the given (filtered) keys and is immutable", () => {
		const loaded = buildLoaded(EMPIRES);
		const next = setMany(loaded, [k("P1", "E2"), k("P3", "E2")], false);

		expect(next).not.toBe(loaded);
		expect(next.has(k("P3", "E2"))).toBe(false);
		expect(next.has(k("P1", "E1"))).toBe(true);
		expect(loaded.has(k("P3", "E2"))).toBe(true);
	});

	it("rebase re-applies pending edits on reloaded data", () => {
		const oldLoaded = buildLoaded(EMPIRES);
		// pending: add P3 to E1, remove P1 from E1
		const current = setMany(
			setMany(oldLoaded, [k("P3", "E1")], true),
			[k("P1", "E1")],
			false
		);
		// reload: a clone P4 appears in E2
		const newLoaded = new Set([...oldLoaded, k("P4", "E2")]);

		const next = rebase(
			oldLoaded,
			newLoaded,
			current,
			new Set(["P1", "P2", "P3", "P4"]),
			new Set(["E1", "E2"])
		);
		expect(next).toEqual(
			new Set([k("P2", "E1"), k("P3", "E1"), k("P3", "E2"), k("P4", "E2")])
		);
	});

	it("rebase drops pending edits of deleted plans and empires", () => {
		const oldLoaded = buildLoaded(EMPIRES);
		const current = setMany(
			oldLoaded,
			[k("P2", "E2"), k("P1", "E2")],
			true
		);
		// P2 deleted, removed from E1 by the backend
		const newLoaded = new Set([k("P1", "E1"), k("P3", "E2")]);

		const next = rebase(
			oldLoaded,
			newLoaded,
			current,
			new Set(["P1", "P3"]),
			new Set(["E1", "E2"])
		);
		expect(next).toEqual(
			new Set([k("P1", "E1"), k("P3", "E2"), k("P1", "E2")])
		);
		expect(diff(newLoaded, next).changedCount).toBe(1);
	});

	it("composable keeps edits across load() and discards them", () => {
		const m = useAssignmentMatrix();
		const plans = new Set(["P1", "P2", "P3"]);
		m.load(EMPIRES, plans);
		expect(m.changes.value.changedCount).toBe(0);

		m.set([k("P3", "E1")], true);
		expect(m.changes.value.changedCount).toBe(1);

		m.load(EMPIRES, plans);
		expect(m.changes.value.changedCount).toBe(1);

		m.discard();
		expect(m.changes.value.changedCount).toBe(0);
		expect(m.current.value).toBe(m.loaded.value);
	});
});
