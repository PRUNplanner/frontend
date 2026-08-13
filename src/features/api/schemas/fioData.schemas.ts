import { z } from "zod";

// Types & Interfaces
import { IFIOProductionFeeTable } from "@/features/api/fioData.types";
import { WORKFORCE_TYPE } from "@/features/planning/usePlanCalculation.types";

const FIO_WORKFORCE_LEVEL_MAP: Record<string, WORKFORCE_TYPE> = {
	PIONEER: "pioneer",
	SETTLER: "settler",
	TECHNICIAN: "technician",
	ENGINEER: "engineer",
	SCIENTIST: "scientist",
};

/**
 * Parses the production fee subset of the FIO /planet/{id} payload into
 * a per-industry, per-workforce fee rate table. Unknown workforce
 * levels are skipped instead of failing the whole payload.
 */
export const FIOPlanetFeeSchema = z
	.object({
		ProductionFees: z
			.array(
				z.object({
					Category: z.string(),
					WorkforceLevel: z.string(),
					FeeAmount: z.number(),
				})
			)
			.nullable(),
	})
	.transform((raw): IFIOProductionFeeTable => {
		const fees: IFIOProductionFeeTable = {};

		(raw.ProductionFees ?? []).forEach((fee) => {
			const workforce: WORKFORCE_TYPE | undefined =
				FIO_WORKFORCE_LEVEL_MAP[fee.WorkforceLevel];

			if (!workforce) return;

			(fees[fee.Category] ??= {})[workforce] = fee.FeeAmount;
		});

		return fees;
	});
