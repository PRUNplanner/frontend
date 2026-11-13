/**
 * The help centre's articles in nav order, grouped by area. A help file
 * needs an entry here and a title key `help.articles.<id>.title`
 * (docs/features/help.md); the tests check both ways.
 *
 * @author jplacht
 */
import type { HelpArea, IHelpArticle } from "./help.types";

export const HELP_AREAS: HelpArea[] = [
	"start",
	"planning",
	"prices",
	"tools",
	"fio",
	"account",
	"reference",
];

export const WHATS_NEW = "whats-new";

// the release every article was last checked against the code
const CHECKED = "0.36.0";

/** a plan-page article: its panel shows the others as chips */
const plan = (id: string, related: string[]): IHelpArticle => ({
	id,
	area: "planning",
	parent: "plan",
	file: id,
	related,
	updatedIn: CHECKED,
});

const entry = (
	id: string,
	area: HelpArea,
	related: string[]
): IHelpArticle => ({ id, area, file: id, related, updatedIn: CHECKED });

/** the task guides, in the order of the home page's "Start here" cards */
export const GUIDES = [
	"guide_first_base",
	"guide_find_planet",
	"guide_cx_prices",
	"guide_chain_to_bases",
	"guide_empire",
	"guide_hand_off",
];

export const HELP_ARTICLES: IHelpArticle[] = [
	{
		id: "help_welcome",
		area: "start",
		related: ["guide_first_base", "plan_layout", "glossary"],
		updatedIn: CHECKED,
	},
	entry("guide_first_base", "start", ["management", "plan_base"]),
	entry("guide_find_planet", "start", ["planet_search", "glossary"]),
	entry("guide_cx_prices", "start", ["exchanges", "plan_check"]),
	entry("guide_chain_to_bases", "start", [
		"tools_production_chain",
		"plan_saving",
	]),
	entry("guide_empire", "start", ["empire", "management"]),
	entry("guide_hand_off", "start", ["plan_tools", "fio_burn"]),
	plan("plan_layout", ["plan_base", "plan_results"]),
	plan("plan_base", ["plan_production", "glossary"]),
	plan("plan_results", ["plan_check", "exchanges"]),
	plan("plan_production", ["plan_results", "exchanges"]),
	plan("plan_tools", ["fio_burn", "fio_repair"]),
	plan("plan_saving", ["management", "plan_sharing"]),
	plan("plan_sharing", ["plan_saving"]),
	plan("plan_check", ["exchanges", "tools_market_live"]),
	entry("empire", "planning", ["management", "plan_check"]),
	entry("management", "planning", ["empire", "exchanges"]),
	entry("exchanges", "prices", ["plan_check", "management"]),
	entry("planet_search", "tools", ["plan_layout", "tools_base_roi"]),
	entry("tools_production_chain", "tools", ["empire", "exchanges"]),
	entry("tools_base_roi", "tools", ["tools_roi_overview", "planet_search"]),
	entry("tools_roi_overview", "tools", [
		"tools_resource_roi_overview",
		"tools_base_roi",
	]),
	entry("tools_resource_roi_overview", "tools", [
		"tools_roi_overview",
		"planet_search",
	]),
	entry("tools_market_report", "tools", [
		"tools_market_exploration",
		"tools_market_live",
	]),
	entry("tools_market_live", "tools", [
		"tools_market_exploration",
		"plan_check",
	]),
	entry("tools_market_exploration", "tools", [
		"tools_market_live",
		"exchanges",
	]),
	entry("tools_hq_upgrade_calculator", "tools", ["exchanges"]),
	entry("tools_upkeep_price_calculator", "tools", ["exchanges"]),
	entry("fio_repair", "fio", ["fio_burn"]),
	entry("fio_burn", "fio", ["fio_repair"]),
	entry("profile", "account", ["api_keys", "exchanges"]),
	entry("api_keys", "account", ["profile"]),
	entry("glossary", "reference", []),
	{
		id: WHATS_NEW,
		area: "reference",
		file: "changelog",
		related: [],
		updatedIn: __APP_VERSION__,
	},
];

/** "Most read" on the home page, until analytics say otherwise */
export const POPULAR_ARTICLES = [
	"plan_check",
	"exchanges",
	"plan_layout",
	"plan_saving",
	"planet_search",
];

const byId = new Map(HELP_ARTICLES.map((a) => [a.id, a]));

export function getArticle(id: string): IHelpArticle | undefined {
	return byId.get(id);
}

/** the plan page's other articles, for the panel's chips */
export function siblings(article: IHelpArticle): IHelpArticle[] {
	return article.parent
		? HELP_ARTICLES.filter((a) => a.parent === article.parent)
		: [];
}

export function prevNext(article: IHelpArticle): {
	prev?: IHelpArticle;
	next?: IHelpArticle;
} {
	const i = HELP_ARTICLES.indexOf(article);
	return { prev: HELP_ARTICLES[i - 1], next: HELP_ARTICLES[i + 1] };
}

export function articlesByArea(): {
	area: HelpArea;
	articles: IHelpArticle[];
}[] {
	return HELP_AREAS.map((area) => ({
		area,
		articles: HELP_ARTICLES.filter((a) => a.area === area),
	}));
}
