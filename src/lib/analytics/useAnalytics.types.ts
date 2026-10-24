import type { HomepageTourName } from "@/features/homepage/homepageTour.types";
import type {
	NavArea,
	NavSection,
} from "@/layout/components/navigation/navigation.types";
import type {
	EmailNudgeAction,
	EmailNudgeState,
} from "@/features/account/useEmailNudge.types";
import type {
	ExpertType,
	InfrastructureType,
	PlanCOGCProgram,
	WorkforceType,
} from "@/features/api/schemas/planningData.schemas";
import type { PlanetSearchView } from "@/features/planet_search/planetSearch.schemas";
import type { ChartView } from "@/features/market_exploration/marketExploration.types";
import type {
	MarketGapBasis,
	MarketIndexView,
	MarketMoversDirection,
} from "@/features/market_report/marketReport.types";
import type {
	APIEndpointFormat,
	APISnippetKind,
} from "@/features/api_keys/apiEndpoints.types";

export type PlanEditField =
	| "building_add"
	| "building_amount"
	| "recipe_add"
	| "recipe_mix_add"
	| "recipe_change"
	| "recipe_delete"
	| "recipe_amount"
	| "workforce"
	| "infrastructure"
	| "expert"
	| "cogc"
	| "corphq"
	| "permits";

export interface IPlanEditProperties {
	planet_natural_id: string;
	field: PlanEditField;
	building_ticker?: string;
	recipe_id?: string;
	amount?: number;
	infrastructure_type?: InfrastructureType;
	expert_type?: ExpertType;
	workforce_type?: WorkforceType;
	lux_type?: string;
	value?: boolean | number | PlanCOGCProgram;
	// only while plan suggestions are on
	is_from_popular?: boolean;
	is_most_planned?: boolean;
	// set by trackPlanEdit: edited on a shared plan's working copy
	is_shared?: boolean;
}

// tools that report a result without further properties
type SimpleToolName =
	| "recipe_roi"
	| "hq_upgrade"
	| "upkeep_price"
	| "market_live"
	| "fio_repair"
	| "fio_burn";

export type ToolUseProperties =
	| { tool_name: SimpleToolName }
	| {
			tool_name: "market_exploration";
			exchange: string;
			material_ticker: string;
	  }
	| { tool_name: "resource_roi"; material_ticker: string }
	| { tool_name: "construction_cart"; built_edited: boolean }
	| {
			tool_name: "planet_search";
			filter: Record<string, string>;
			result_count: number;
	  }
	| {
			tool_name: "production_chain";
			material_ticker: string;
			amount: number;
			recipes: string[];
			terminals: string;
	  };

// which XIT transfer button: the tool, and which of its buttons
export type XITTransferSource =
	| "supply_cart"
	| "supply_cart_initial"
	| "construction_cart"
	| "construction_cart_need"
	| "repair_due"
	| "repair_materials"
	| "fio_repair"
	| "hq_upgrade";

type Trigger = "button" | "shortcut";

// the landing page's login / registration panel
type AuthPanel = "login" | "registration";

// the save conflict dialog's options, "close" keeps the edits unsaved
type SaveConflictChoice = "save_as_new" | "overwrite" | "reload" | "close";

/** Another tab saved or deleted what an open editor shows */
export interface IRemoteChangeProperties {
	object_type: "plan" | "empire" | "cx";
	has_unsaved_edits: boolean;
	is_deleted: boolean;
}

/**
 * The tracking plan: every event and its properties, documented in
 * docs/analytics.md. Names are `category:object_action`.
 */
export interface IAnalyticsEventProperties {
	"account:signup_complete": undefined;
	"account:signup_fail": { fields: string[] };
	"account:login": undefined;
	"account:logout": undefined;
	"account:email_verify": {
		is_success: boolean;
		source: "banner" | "profile" | "link";
		reason?: string;
	};
	"account:email_nudge_shown": { state: EmailNudgeState };
	"account:email_nudge_action": {
		action: EmailNudgeAction;
		state: EmailNudgeState;
	};
	"account:email_add": { is_success: boolean; reason?: string };
	"account:email_verify_request": undefined;
	"account:password_reset_request": undefined;
	"account:password_reset": undefined;
	"account:password_change": undefined;
	"account:profile_update": undefined;
	"account:fio_update": { is_active: boolean };
	"account:fio_link": undefined;
	"account:fio_link_failed": { reason: string };
	"account:api_key_create": undefined;
	"account:api_key_revoke": undefined;
	"landing:auth_open": {
		panel: AuthPanel;
		source:
			| "header"
			| "hero"
			| "closing"
			| "shared_plan"
			| "planet_search_plan"
			| "planet_search_distance";
	};
	"landing:auth_switch": { panel: AuthPanel };
	"landing:example_open": { source: "hero" | "shared_plans" };
	// clicks only, an automatic advance sends nothing
	"landing:tour_step": { tour: HomepageTourName; step: string };
	"landing:tour_toggle": { tour: HomepageTourName; is_playing: boolean };
	"landing:market_click": { target: "header" | "cta" | "sector" | "mover" };
	"landing:planet_search_click": { target: "header" | "tour" };
	"landing:market_view_change": { view: MarketMoversDirection };
	"apikey:key_copy": undefined;
	"apikey:builder_change": {
		endpoint: string;
		format: APIEndpointFormat;
	};
	"apikey:snippet_copy": {
		endpoint: string;
		format: APIEndpointFormat;
		kind: APISnippetKind;
		has_key: boolean;
	};
	"apikey:use_in_builder": undefined;

	"plan:view": { planet_natural_id: string | undefined; is_shared: boolean };
	"plan:create": { planet_natural_id: string; is_first_plan: boolean };
	"plan:save": { planet_natural_id: string; trigger: Trigger };
	"plan:save_as": { planet_natural_id: string };
	"plan:reload": { planet_natural_id: string };
	"plan:leave_unsaved": { planet_natural_id: string };
	"plan:shared_clone": {
		planet_natural_id: string;
		shared_uuid: string;
		modified: boolean;
	};
	"plan:shared_reset": { planet_natural_id: string };
	"plan:shared_copy_changes": {
		planet_natural_id: string;
		change_count: number;
	};
	"plan:share_create": undefined;
	"plan:share_delete": undefined;
	"plan:tool_toggle": { tool_name: string | null };
	"plan:plancheck_change": {
		view: "market" | "sensitivity" | "compare";
		pct?: number;
	};
	"plan:plancheck_target": { has_target: boolean };
	"plan:market_flag_open": {
		where: "plan" | "empire";
		level: "red" | "amber" | "muted";
	};
	"plan:plancheck_compare": { same_planet: boolean };
	"plan:profit_breakdown_mode": { mode: "cost_type" | "building" };
	"plan:cogm_open": { planet_natural_id: string; recipe_id: string };
	"plan:insights_open": { planet_natural_id: string };
	"plan:starter_show": {
		planet_natural_id: string;
		candidate_count: number;
	};
	"plan:starter_apply": {
		planet_natural_id: string;
		building_count: number;
		expert_count: number;
		is_selection_changed: boolean;
	};
	"plan:starter_dismiss": { planet_natural_id: string };
	"plan:hab_optimize": { goal: "auto" | "area" | "cost" };
	"plan:hab_auto_toggle": { is_active: boolean };
	"plan:edit": IPlanEditProperties;
	"plan:undo": { trigger: Trigger };
	"plan:redo": { trigger: Trigger };
	"plan:save_conflict": {
		planet_natural_id: string;
		is_deleted: boolean;
		choice: SaveConflictChoice;
	};

	"planet:popr_load": { planet_natural_id: string };

	"empire:create": undefined;
	"empire:update": { is_success: boolean };
	"empire:reload": undefined;
	"empire:material_io_expand": undefined;
	"empire:market_filter": { level: "red" | "amber" | "muted" | null };
	"empire:view_change": { view: "materialio" | "analysis" | "opportunities" };
	"empire:analysis_more_charts": undefined;
	"empire:save_conflict": { choice: SaveConflictChoice };

	"manage:cx_create": undefined;
	"manage:cx_delete": { cx_uuid: string };
	"manage:empire_create": undefined;
	"manage:empire_delete": { empire_uuid: string };
	"manage:empire_cx_assign": undefined;
	"manage:plan_empire_assign": undefined;
	"manage:plan_assign_all": { is_assigned: boolean };
	"manage:plan_clone": { plan_uuid: string };
	"manage:plan_delete": { plan_uuid: string };
	"manage:plan_delete_bulk": { count: number };

	"exchange:update": { location: string; cx_uuid: string };
	"exchange:discard": { location: string };
	// a material row expanded to its price cascade
	"exchange:price_detail": { location: string; material_ticker: string };
	"exchange:preset": {
		preset: "average" | "trade_now";
		scope: "all" | "planet";
	};
	"exchange:use_cogm": {
		location: "exchanges_view" | "cogm";
		material_ticker: string;
	};
	"exchange:leave_unsaved": { location: string };
	"exchange:save_conflict": { location: string; choice: SaveConflictChoice };

	"material:market_drawer_open": {
		material_ticker: string;
		source: "tile" | "card";
	};
	"material:market_card_pin": { material_ticker: string };

	"planet_search:view_change": { view: PlanetSearchView };
	"market_exploration:view_change": { view: ChartView };
	"resource_roi:chart_open": undefined;
	"market:view_change":
		| { chart: "index"; view: MarketIndexView }
		| { chart: "workforce"; view: WorkforceType }
		| { chart: "movers"; view: MarketMoversDirection | "all" }
		| { chart: "leaders"; view: "all" | "top" }
		| { chart: "gaps"; view: MarketGapBasis | "all" };

	"tool:use": ToolUseProperties;

	"repair_analysis:interval_set": {
		source: "input" | "slider" | "preset" | "reset";
		ticker: string;
		in_range: boolean;
	};

	"fio_repair:base_open": {
		status: "overdue" | "soon" | "later" | "unknown";
		confidence: "match" | "likely" | "picked" | "nopick" | "none";
	};
	"fio_repair:plan_link_set": { to: "plan" | "none" | "auto" };
	"fio_repair:setting_change": {
		setting: "interval" | "due_soon" | "arrival" | "exchange" | "use_plans";
	};

	"xit:burn_open": undefined;
	"xit:burn_copy": undefined;
	"xit:burn_ship_fit": { weight: number; volume: number };
	"xit:transfer_open": { source?: XITTransferSource };
	"xit:transfer_copy": { source?: XITTransferSource };

	"app:navigation_toggle": { navigation_style: "full" | "collapsed" };
	"app:nav_click": { target: string; area: NavArea; section: NavSection };
	"app:version_reload": { source: "notice" | "chip" | "navigation" };
	"app:version_later": undefined;
	"app:whats_new_click": undefined;
	"app:remote_change": IRemoteChangeProperties;
	"app:session_change": { reason: "logout" | "login" | "other_user" };
	"app:db_blocked": undefined;
	"debug:calc_toggle": {
		on: boolean;
		source: "url" | "debug_page" | "panel";
	};
	"debug:calc_open": { source: Trigger };
	"debug:calc_copy": { format: "text" | "json" };

	"onboarding:step_click": {
		step: "empire_save" | "planet_search" | "exchanges";
	};

	"perf:gamedata_load": IGameDataLoadProperties;
	"perf:content_ready": {
		// from the navigation start to the content's first frame
		ms: number;
		nav: "hard" | "spa";
		loader_shown: boolean;
	};
}

/** How one game data list loaded, once per store per tab */
export interface IGameDataLoadProperties {
	store: "materials" | "exchanges" | "buildings" | "recipes";
	source: "cache" | "network";
	// IndexedDB held the list, older than its stale time
	is_stale: boolean;
	// age of the IndexedDB copy, null without one
	age_min: number | null;
	// what the caller waited
	ms_total: number;
	ms_idb_read?: number;
	ms_fetch?: number;
	ms_idb_write?: number;
}

export type ANALYTICS_EVENT_TYPE = keyof IAnalyticsEventProperties;
