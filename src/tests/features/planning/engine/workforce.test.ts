import { describe, it, expect } from "vitest";

// Engine
import { getBuildingWorkforceMaterials } from "@/features/planning/engine/workforce";

// Types & Interfaces
import type { Building } from "@/features/api/schemas/gameData.schemas";
import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
import type {
	IMaterialIOMinimal,
	IWorkforceElement,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";

// ORC: 70 settlers, 10 technicians
const orc = {
	pioneers: 0,
	settlers: 70,
	technicians: 10,
	engineers: 0,
	scientists: 0,
} as Building;

const technicianOnly = ["HMS", "SCN", "SC", "ALE"];

function element(
	name: WorkforceType,
	capacity: number,
	required: number,
	lux1 = true,
	lux2 = true
): IWorkforceElement {
	return {
		name,
		capacity,
		required,
		left: capacity - required,
		lux1,
		lux2,
		efficiency: 1,
	};
}

// a plan of ORC, settlers and technicians housed as given
function plan(
	settler: IWorkforceElement,
	technician: IWorkforceElement
): IWorkforceRecord {
	return {
		pioneer: element("pioneer", 0, 0),
		settler,
		technician,
		engineer: element("engineer", 0, 0),
		scientist: element("scientist", 0, 0),
	};
}

const input = (materials: IMaterialIOMinimal[], ticker: string) =>
	materials.find((m) => m.ticker === ticker)?.input;

describe("getBuildingWorkforceMaterials", () => {
	const reference = getBuildingWorkforceMaterials(orc);

	it("without a plan workforce: fully staffed, both luxuries", () => {
		expect(reference.map((m) => m.ticker)).toEqual(
			expect.arrayContaining(["REP", "KOM", ...technicianOnly])
		);
		expect(input(reference, "DW")).toBeCloseTo(70 * 0.05 + 10 * 0.075);
	});

	it("fully housed with both luxuries is exactly the reference", () => {
		expect(
			getBuildingWorkforceMaterials(
				orc,
				plan(
					element("settler", 1000, 700),
					element("technician", 100, 100)
				)
			)
		).toStrictEqual(reference);
	});

	it("no technician housing: no technician consumables (#254)", () => {
		const materials = getBuildingWorkforceMaterials(
			orc,
			plan(element("settler", 100, 70), element("technician", 0, 10))
		);

		for (const ticker of technicianOnly)
			expect(input(materials, ticker)).toBeUndefined();
		expect(input(materials, "REP")).toBe(input(reference, "REP"));
		expect(input(materials, "KOM")).toBe(input(reference, "KOM"));
		expect(input(materials, "DW")).toBeCloseTo(70 * 0.05);
	});

	it("half the technicians housed: half the technician consumables", () => {
		const materials = getBuildingWorkforceMaterials(
			orc,
			plan(element("settler", 100, 70), element("technician", 50, 100))
		);

		for (const ticker of technicianOnly)
			expect(input(materials, ticker)).toBeCloseTo(
				input(reference, ticker)! / 2
			);
	});

	it("luxuries off: that type's luxuries drop out (#490)", () => {
		const housed = (lux1: boolean, lux2: boolean) =>
			getBuildingWorkforceMaterials(
				orc,
				plan(
					element("settler", 100, 70, lux1, lux2),
					element("technician", 100, 10)
				)
			);

		expect(input(housed(false, true), "REP")).toBeUndefined();
		expect(input(housed(false, true), "KOM")).toBe(input(reference, "KOM"));
		expect(input(housed(true, false), "KOM")).toBeUndefined();
		expect(input(housed(true, false), "REP")).toBe(input(reference, "REP"));
		// technician luxuries and basic needs stay
		expect(housed(false, false)).toStrictEqual(
			reference.filter((m) => !["REP", "KOM"].includes(m.ticker))
		);
	});

	it("nobody required: housed means full, unhoused means none", () => {
		expect(
			getBuildingWorkforceMaterials(
				orc,
				plan(element("settler", 100, 0), element("technician", 100, 0))
			)
		).toStrictEqual(reference);
		expect(
			getBuildingWorkforceMaterials(
				orc,
				plan(element("settler", 0, 0), element("technician", 0, 0))
			)
		).toStrictEqual([]);
	});
});
