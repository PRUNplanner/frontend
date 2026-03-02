// Linear Solver
import { solve, lessEq, greaterEq, Model, Constraint, Solution } from "yalps";

// Types & Interfaces
import {
	INFRASTRUCTURE_TYPE,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import { IInfrastructureCosts } from "@/features/cx/usePrice.types";
export type HabSolverGoal = "auto" | "cost" | "area";

const HabArea = {
	HB1: 10,
	HB2: 12,
	HB3: 14,
	HB4: 16,
	HB5: 18,
	HBB: 14,
	HBC: 17,
	HBM: 20,
	HBL: 22,
};

export function calculateAvailableArea(
	totalArea: number,
	usedArea: number,
	infrastructure: Record<INFRASTRUCTURE_TYPE, number>
): number {
	let currentHabArea = 0;
	for (const habType in HabArea) {
		const habCount = infrastructure[habType as INFRASTRUCTURE_TYPE] || 0;
		const habArea = HabArea[habType as keyof typeof HabArea];
		currentHabArea += habCount * habArea;
	}
	const productionArea = usedArea - currentHabArea;
	return totalArea - productionArea;
}

export function optimizeHabs(
	goal: HabSolverGoal,
	costs: IInfrastructureCosts,
	workforceRequired: IWorkforceRecord,
	availableArea: number,
	constrainArea: boolean = false
): Solution {
	if (goal === "auto") {
		const costWorked = optimizeHabs(
			"cost",
			costs,
			workforceRequired,
			availableArea,
			true
		);
		if (costWorked.status === "optimal") {
			return costWorked;
		}
		// We couldn't fit into the area, try again minimizing area (which isn't bounded)
		return optimizeHabs("area", costs, workforceRequired, availableArea);
	}

	const constraints = new Map<string, Constraint>();
	for (const workforceType in workforceRequired) {
		const required =
			workforceRequired[workforceType as keyof IWorkforceRecord].required;
		if (required !== 0) {
			constraints.set(workforceType, greaterEq(required));
		}
	}
	// prettier-ignore
	const variables = {
		HB1: { area: HabArea.HB1, cost: costs.HB1, pioneer: 100, settler: 0,   technician: 0,   engineer: 0,   scientist: 0   },
		HB2: { area: HabArea.HB2, cost: costs.HB2, pioneer: 0,   settler: 100, technician: 0,   engineer: 0,   scientist: 0   },
		HB3: { area: HabArea.HB3, cost: costs.HB3, pioneer: 0,   settler: 0,   technician: 100, engineer: 0,   scientist: 0   },
		HB4: { area: HabArea.HB4, cost: costs.HB4, pioneer: 0,   settler: 0,   technician: 0,   engineer: 100, scientist: 0   },
		HB5: { area: HabArea.HB5, cost: costs.HB5, pioneer: 0,   settler: 0,   technician: 0,   engineer: 0,   scientist: 100 },
		HBB: { area: HabArea.HBB, cost: costs.HBB, pioneer: 75,  settler: 75,  technician: 0,   engineer: 0,   scientist: 0   },
		HBC: { area: HabArea.HBC, cost: costs.HBC, pioneer: 0,   settler: 75,  technician: 75,  engineer: 0,   scientist: 0   },
		HBM: { area: HabArea.HBM, cost: costs.HBM, pioneer: 0,   settler: 0,   technician: 75,  engineer: 75,  scientist: 0   },
		HBL: { area: HabArea.HBL, cost: costs.HBL, pioneer: 0,   settler: 0,   technician: 0,   engineer: 75,  scientist: 75  },
	};

	if (goal === "cost" && constrainArea) {
		constraints.set("area", lessEq(availableArea));
	}
	// If goal is area, we do not set an area constraint so we'll find a result even if we don't fit

	const model: Model = {
		direction: "minimize",
		objective: goal,
		constraints: constraints,
		variables: variables,
		// prettier-ignore
		integers: ["HB1", "HB2", "HB3", "HB4", "HB5", "HBB", "HBC", "HBM", "HBL"],
	};

	return solve(model, { includeZeroVariables: true });
}
