// Types & Interfaces
import { WORKFORCE_TYPE } from "@/features/planning/usePlanCalculation.types";

/**
 * Per-industry production fee rates by workforce tier, in the planet's
 * local currency per 24h, as set by the planet's governing entity.
 */
export type IFIOProductionFeeTable = Record<
	string,
	Partial<Record<WORKFORCE_TYPE, number>>
>;
