import { z } from "zod";

/** a ready-made workflow clients offer as a command */
export interface IPrompt {
	name: string;
	title: string;
	description: string;
	argsSchema: z.ZodObject;
	text(args: Record<string, string | undefined>): string;
}

// shared by every prompt: inform, the player decides (owner, 2026-11-18)
const DECIDE =
	"Show the options with their numbers and trade-offs and let me choose; only recommend when I ask. Mention the market (daily volume, my share) for anything I'd produce more of. Save nothing unless I say so.";

export const PROMPTS: IPrompt[] = [
	{
		name: "review_plan",
		title: "Review a plan",
		description:
			"Tries every lever of one plan without changing its buildings and shows what each is worth per day.",
		argsSchema: z.object({
			plan: z.string().describe("Plan name or uuid"),
		}),
		text: ({ plan }) =>
			`Review my PRUNplanner plan "${plan}" without changing which buildings it has or how many. Find it with list_plans, then get_plan. Try each lever with calculate_plan_variant, one at a time, and report its effect on profit per day and payback: experts "auto" against the saved ones; each workforce tier's luxuries on and off; the planet's active COGC program if the plan assumes another; habs "auto"; storage for my visit interval (ask me); other recipes in the same buildings (rank_recipes per building). Check the prices with check_plan_market (thin markets, ask/bid, the profit range). End with a short table: lever, change, profit per day before and after, cost, payback. ${DECIDE}`,
	},
	{
		name: "review_empire",
		title: "Review my empire",
		description:
			"An honest look at an empire: what earns, what is weak or risky, where it depends on thin markets.",
		argsSchema: z.object({
			empire: z
				.string()
				.optional()
				.describe("Empire name or uuid (default: my default empire)"),
		}),
		text: ({ empire }) =>
			`Review my PRUNplanner empire${empire ? ` "${empire}"` : " (my default empire, else ask which)"} like an experienced player would: list_empires, list_plans for it (with profit), get_empire. Tell me which bases carry the profit and which barely pay back (ROI, margin), what the empire makes and buys most, where check_plan_market shows thin markets or a big share of the daily volume, what check_make_or_buy says about the largest inputs, and for the two weakest bases whether find_planets (with plan_uuid) shows clearly better planets. Be honest and specific with the numbers; it's fine to be blunt. ${DECIDE}`,
	},
	{
		name: "vertical_chain",
		title: "Plan a vertical chain",
		description:
			"The production chain for a material at a daily rate, with correct ratios, split into bases near an exchange.",
		argsSchema: z.object({
			material: z.string().describe("Material ticker, e.g. AL"),
			per_day: z
				.string()
				.optional()
				.describe("Units per day (default 100)"),
			exchange: z
				.string()
				.optional()
				.describe("Exchange to build near: AI1, CI1, IC1 or NC1"),
		}),
		text: ({ material, per_day, exchange }) =>
			`Help me plan a vertically integrated chain for ${material} at ${per_day ?? "100"} per day${exchange ? `, with bases near ${exchange}` : ""}. Start with get_production_cost (per_day, raw_source "extract") for the steps, ratios and buildings, and check_make_or_buy for what's worth making versus buying. Group the steps into a few bases (one planet each, about 500 area per permit). For bases that extract, find_planets with the resource${exchange ? ` and near_exchange ${exchange}` : ""}; for the others, planets whose COGC program fits. Use get_distances to keep the bases close to each other and the exchange. Calculate each base with calculate_new_plan and the set together with calculate_empire_variant. Show two or three alternatives (planets, splits) with profit, construction cost, payback and the market for the outputs. ${DECIDE}`,
	},
	{
		name: "load_lists",
		title: "Load lists for my bases",
		description:
			"Supply load lists and XIT packages for a group of bases at the group's fastest visit interval.",
		argsSchema: z.object({
			bases: z
				.string()
				.optional()
				.describe(
					"An empire, or plan names or uuids separated by commas (default: my default empire)"
				),
		}),
		text: ({ bases }) =>
			`Make supply load lists for ${bases ? `these bases: ${bases}` : "the bases of my default empire (else ask which)"}. For each base get_plan and read shipping: the daily import weight and volume and storage_days. Use the shortest storage_days of the group as the visit interval (tell me which base sets it, and offer a rounder interval if that's more practical). For each base call get_xit_action with kind "supply" and that interval as days, and list its materials, weight and volume, plus the JSON to paste into XIT ACT. Add get_distances between the bases and their nearest exchange so I can see how they sit; don't plan ship routes, fuel or flight times. ${DECIDE}`,
	},
];
