import { z } from "zod";

// Util
import {
	normaliseFolded,
	normaliseLayout,
} from "@/features/planning/layout/normaliseLayout";

/** Which layout the plan page uses: a preset, or the one Custom Layout */
export const LayoutChoiceSchema = z.enum(["standard", "custom"]);
export type LayoutChoice = z.infer<typeof LayoutChoiceSchema>;

/**
 * The layout as stored (the tab's sessionStorage here, the account's
 * preferences from plan-layouts-03): the grid is checked item by item and
 * fixed up by normaliseLayout, so one bad item never loses the rest
 */
export const StoredLayoutSchema = z
	.object({
		v: z.literal(1),
		preset: LayoutChoiceSchema,
		custom: z.unknown().nullable(),
		folded: z.unknown().optional(),
		// Tinted parts: a lighter background on every part; kept only when on
		tinted: z.boolean().optional().catch(undefined),
	})
	.transform((s) => ({
		v: 1 as const,
		preset: s.preset,
		custom:
			s.custom === null || s.custom === undefined
				? null
				: normaliseLayout(s.custom),
		folded: normaliseFolded(s.folded),
		...(s.tinted ? { tinted: true as const } : {}),
	}));
export type StoredLayout = z.output<typeof StoredLayoutSchema>;
