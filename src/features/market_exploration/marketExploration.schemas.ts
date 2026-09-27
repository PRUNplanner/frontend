import { z } from "zod";

const ExplorationSchema = z.object({
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
export type Exploration = z.infer<typeof ExplorationSchema>;

export const ExplorationPayloadSchema = z.array(ExplorationSchema);
