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

export const HELP_ARTICLES: IHelpArticle[] = [
	{
		id: "help_welcome",
		area: "start",
		related: ["plan_layout", "management", "planet_search"],
		updatedIn: "0.28.0",
	},
	{
		id: "plan_layout",
		area: "planning",
		parent: "plan",
		file: "plan_layout",
		related: ["plan_results"],
		updatedIn: "0.36.0",
	},
	{
		id: "plan_results",
		area: "planning",
		parent: "plan",
		file: "plan_results",
		related: ["plan_check", "exchanges"],
		updatedIn: "0.36.0",
	},
	{
		id: "plan_production",
		area: "planning",
		parent: "plan",
		file: "plan_production",
		related: ["plan_results", "exchanges"],
		updatedIn: "0.36.0",
	},
	{
		id: "plan_saving",
		area: "planning",
		parent: "plan",
		file: "plan_saving",
		related: ["management"],
		updatedIn: "0.36.0",
	},
	{
		id: "plan_check",
		area: "planning",
		parent: "plan",
		file: "plan_check",
		related: ["exchanges", "tools_market_live"],
		updatedIn: "0.36.0",
	},
	{
		id: "empire",
		area: "planning",
		file: "empire",
		related: ["management", "plan_check"],
		updatedIn: "0.28.0",
	},
	{
		id: "management",
		area: "planning",
		file: "management",
		related: ["empire", "exchanges"],
		updatedIn: "0.31.1",
	},
	{
		id: "exchanges",
		area: "prices",
		file: "exchanges",
		related: ["plan_check", "management"],
		updatedIn: "0.31.1",
	},
	{
		id: "planet_search",
		area: "tools",
		file: "planet_search",
		related: ["plan_layout", "tools_base_roi"],
		updatedIn: "0.35.1",
	},
	{
		id: "tools_production_chain",
		area: "tools",
		file: "tools_production_chain",
		related: ["empire", "exchanges"],
		updatedIn: "0.35.0",
	},
	{
		id: "tools_base_roi",
		area: "tools",
		file: "tools_base_roi",
		related: ["tools_roi_overview", "planet_search"],
		updatedIn: "0.36.0",
	},
	{
		id: "tools_roi_overview",
		area: "tools",
		file: "tools_roi_overview",
		related: ["tools_resource_roi_overview", "tools_base_roi"],
		updatedIn: "0.28.0",
	},
	{
		id: "tools_resource_roi_overview",
		area: "tools",
		file: "tools_resource_roi_overview",
		related: ["tools_roi_overview", "planet_search"],
		updatedIn: "0.28.0",
	},
	{
		id: "tools_market_live",
		area: "tools",
		file: "tools_market_live",
		related: ["tools_market_exploration", "plan_check"],
		updatedIn: "0.31.0",
	},
	{
		id: "tools_market_exploration",
		area: "tools",
		file: "tools_market_exploration",
		related: ["tools_market_live", "exchanges"],
		updatedIn: "0.31.0",
	},
	{
		id: "tools_hq_upgrade_calculator",
		area: "tools",
		file: "tools_hq_upgrade_calculator",
		related: ["exchanges"],
		updatedIn: "0.28.0",
	},
	{
		id: "tools_upkeep_price_calculator",
		area: "tools",
		file: "tools_upkeep_price_calculator",
		related: ["exchanges"],
		updatedIn: "0.30.0",
	},
	{
		id: "fio_repair",
		area: "fio",
		file: "fio_repair",
		related: ["fio_burn"],
		updatedIn: "0.31.1",
	},
	{
		id: "fio_burn",
		area: "fio",
		file: "fio_burn",
		related: ["fio_repair"],
		updatedIn: "0.28.0",
	},
	{
		id: "profile",
		area: "account",
		file: "profile",
		related: ["exchanges"],
		updatedIn: "0.28.0",
	},
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
