import { z } from "zod";
import { IExploration } from "@/features/market_exploration/marketExploration.types";

const ExplorationSchema: z.ZodType<IExploration> = z.object({
	ticker: z.string().min(1).max(3),
	exchange_code: z.string().min(3).max(3),
	date_epoch: z.number(),
	open_p: z.number(),
	close_p: z.number(),
	high_p: z.number(),
	low_p: z.number(),
	volume: z.number(),
	traded: z.number(),
});

export const ExplorationPayloadSchema: z.ZodType<IExploration[]> =
	z.array(ExplorationSchema);

export type ExplorationPayloadType = z.infer<typeof ExplorationPayloadSchema>;
