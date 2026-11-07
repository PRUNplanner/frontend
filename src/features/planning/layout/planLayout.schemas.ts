import { z } from "zod";

// Util
import {
	normaliseCustom,
	normaliseFoldedBy,
} from "@/features/planning/layout/normaliseLayout";

/** Which layout the plan page uses: a preset, or the one Custom Layout */
export const LayoutChoiceSchema = z.enum(["standard", "custom"]);
export type LayoutChoice = z.infer<typeof LayoutChoiceSchema>;

/**
 * The layout as stored (the tab's sessionStorage here, the account's
 * preferences from plan-layouts-03): each grid is checked item by item and
 * fixed up by normaliseLayout, so one bad item never loses the rest. Custom
 * Layout has a Wide and maybe a Phone arrangement, folded parts are kept
 * per arrangement; the shape before that (one grid, one list) reads as Wide.
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
				: normaliseCustom(s.custom),
		folded: normaliseFoldedBy(s.folded),
		...(s.tinted ? { tinted: true as const } : {}),
	}));
export type StoredLayout = z.output<typeof StoredLayoutSchema>;
