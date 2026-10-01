import type {
	ExpertType,
	InfrastructureType,
	PlanCOGCProgram,
	WorkforceType,
} from "@/features/api/schemas/planningData.schemas";

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
	| { tool_name: "market_exploration"; exchange: string; material_ticker: string }
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

type Trigger = "button" | "shortcut";

/**
 * The tracking plan: every event and its properties, documented in
 * docs/analytics.md. Names are `category:object_action`.
 */
export interface IAnalyticsEventProperties {
	"account:signup_complete": undefined;
	"account:signup_fail": { fields: string[] };
	"account:login": undefined;
	"account:logout": undefined;
	"account:email_verify": { is_success: boolean };
	"account:email_verify_request": undefined;
	"account:password_reset_request": undefined;
	"account:password_reset": undefined;
	"account:password_change": undefined;
	"account:profile_update": undefined;
	"account:fio_update": { is_active: boolean };
	"account:fio_link": undefined;
	"account:fio_link_failed": { reason: string };
	"account:api_key_create": undefined;

	"plan:view": { planet_natural_id: string | undefined; is_shared: boolean };
	"plan:create": { planet_natural_id: string; is_first_plan: boolean };
	"plan:save": { planet_natural_id: string; trigger: Trigger };
	"plan:save_as": { planet_natural_id: string };
	"plan:reload": { planet_natural_id: string };
	"plan:leave_unsaved": { planet_natural_id: string };
	"plan:shared_clone": { planet_natural_id: string; shared_uuid: string };
	"plan:share_create": undefined;
	"plan:share_delete": undefined;
	"plan:tool_toggle": { tool_name: string | null };
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

	"planet:popr_load": { planet_natural_id: string };

	"empire:create": undefined;
	"empire:update": { is_success: boolean };
	"empire:reload": undefined;
	"empire:material_io_expand": undefined;

	"manage:cx_create": undefined;
	"manage:cx_delete": { cx_uuid: string };
	"manage:empire_create": undefined;
	"manage:empire_delete": { empire_uuid: string };
	"manage:empire_cx_assign": undefined;
	"manage:plan_empire_assign": undefined;
	"manage:plan_assign_all": { is_assigned: boolean };
	"manage:plan_clone": { plan_uuid: string };
	"manage:plan_delete": { plan_uuid: string };

	"exchange:update": { location: string; cx_uuid: string };
	"exchange:reload": { location: string };

	"material:market_drawer_open": { material_ticker: string };

	"tool:use": ToolUseProperties;

	"xit:burn_open": undefined;
	"xit:burn_copy": undefined;
	"xit:burn_ship_fit": { weight: number; volume: number };
	"xit:transfer_open": undefined;
	"xit:transfer_copy": undefined;

	"app:navigation_toggle": { navigation_style: "full" | "collapsed" };
	"app:version_reload": undefined;

	"onboarding:step_click": {
		step: "empire_save" | "planet_search" | "exchanges";
	};
}

export type ANALYTICS_EVENT_TYPE = keyof IAnalyticsEventProperties;
