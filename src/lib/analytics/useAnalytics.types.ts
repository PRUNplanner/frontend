import { PLAN_COGCPROGRAM_TYPE } from "@/stores/planningStore.types";
import {
	EXPERT_TYPE,
	INFRASTRUCTURE_TYPE,
	WORKFORCE_TYPE,
} from "@/features/planning/usePlanCalculation.types";
import { IPlanetSearchAdvanced } from "@/features/api/gameData.types";

export type ANALYTICS_EVENT_TYPE =
	| "empire_patch"
	| "empire_reload"
	| "exchange_patch"
	| "exchange_reload"
	| "manage_cx_create"
	| "manage_cx_delete"
	| "manage_empire_create"
	| "manage_empire_delete"
	| "manage_empire_junctions_update"
	| "manage_plans_assign_all"
	| "manage_plans_clone"
	| "manage_plans_delete"
	| "manage_plans_junctions_update"
	| "manage_plans_reload"
	| "marketexploration_explore"
	| "materialtile_market_drawer"
	| "navigation_toggle"
	| "page_view"
	| "plan_create_building"
	| "plan_create"
	| "plan_leave_changed"
	| "plan_reload"
	| "plan_save"
	| "plan_save_as"
	| "plan_share_create"
	| "plan_share_delete"
	| "plan_shared_cloned"
	| "plan_show_configuration"
	| "plan_tool_optimize_habitation"
	| "plan_tool_optimize_habitation_active"
	| "plan_tool_view"
	| "plan_tool_cogm"
	| "plan_update_building_add_recipe"
	| "plan_update_building_change_recipe"
	| "plan_update_building_delete_recipe"
	| "plan_update_building_recipe_amount"
	| "plan_update_building"
	| "plan_update_cogc"
	| "plan_update_corphq"
	| "plan_update_expert"
	| "plan_update_infrastructure"
	| "plan_update_permits"
	| "plan_update_workforce"
	| "plan_view"
	| "planet_search_advanced"
	| "planet_search_basic"
	| "popr_load"
	| "production_chain"
	| "resource_roi_overview"
	| "user_login"
	| "user_logout"
	| "user_password_change"
	| "user_password_reset"
	| "user_profile_change"
	| "user_profile_change_fio"
	| "user_registration"
	| "user_request_email_verification"
	| "user_request_password_reset"
	| "user_verify_email"
	| "version_reload"
	| "version_reload"
	| "xit_burn_copy"
	| "xit_burn_fit_ship"
	| "xit_burn_show"
	| "xit_transfer_copy"
	| "xit_transfer_show";

export interface IAnalyticsEventProperties {
	page_view: {
		page_name: string;
		referrer?: string;
	};
	plan_tool_view: {
		name: string | null;
	};
	plan_save: {
		planetNaturalId: string;
	};
	plan_save_as: {
		planetNaturalId: string;
	};
	plan_create: {
		planetNaturalId: string;
	};
	plan_reload: {
		planetNaturalId: string;
	};
	plan_shared_cloned: {
		sharedUuid: string;
		planetNaturalId: string;
	};
	plan_leave_changed: {
		planetNaturalId: string;
	};
	user_password_reset: undefined;
	user_request_password_reset: undefined;
	user_verify_email: { status: boolean };
	empire_reload: { status: boolean };
	empire_patch: { status: boolean };
	popr_load: { planetNaturalId: string };
	manage_cx_create: undefined;
	manage_cx_delete: { cxUuid: string };
	manage_empire_delete: { empireUuid: string };
	manage_empire_junctions_update: undefined;
	manage_empire_create: undefined;
	manage_plans_reload: undefined;
	manage_plans_assign_all: { value: boolean };
	manage_plans_junctions_update: undefined;
	manage_plans_clone: { planUuid: string };
	manage_plans_delete: { planUuid: string };
	materialtile_market_drawer: { materialTicker: string };
	resource_roi_overview: { materialTicker: string };
	planet_search_basic: { searchId: string };
	planet_search_advanced: IPlanetSearchAdvanced;
	user_password_change: undefined;
	user_logout: undefined;
	user_login: { username: string };
	user_registration: { username: string };
	user_profile_change: undefined;
	user_profile_change_fio: { active: boolean };
	user_request_email_verification: undefined;
	version_reload: undefined;
	navigation_toggle: { size: "full" | "collapsed" };
	xit_burn_show: undefined;
	xit_burn_copy: undefined;
	xit_transfer_show: undefined;
	xit_transfer_copy: undefined;
	plan_share_delete: undefined;
	plan_share_create: undefined;
	exchange_reload: { location: string };
	exchange_patch: { cxUuid: string; location: string };
	marketexploration_explore: { exchange: string; materialTicker: string };
	production_chain: {
		materialTicker: string;
		amount: number;
		recipes: string[];
		terminals: string;
	};
	plan_view: {
		planetNaturalId: string | undefined;
		shared: boolean;
	};
	plan_update_permits: {
		planetNaturalId: string;
		permits: number;
	};
	plan_update_corphq: {
		planetNaturalId: string;
		corphq: boolean;
	};
	plan_update_cogc: {
		planetNaturalId: string;
		cogc: PLAN_COGCPROGRAM_TYPE;
	};
	plan_update_expert: {
		planetNaturalId: string;
		expertType: EXPERT_TYPE;
		amount: number;
	};
	plan_update_infrastructure: {
		planetNaturalId: string;
		infrastructureType: INFRASTRUCTURE_TYPE;
		amount: number;
	};
	plan_create_building: {
		planetNaturalId: string;
		buildingTicker: string;
	};
	plan_update_building: {
		planetNaturalId: string;
		buildingTicker: string;
		amount: number;
	};
	plan_update_building_recipe_amount: {
		planetNaturalId: string;
		buildingTicker: string;
		recipeIndex: number;
		amount: number;
	};
	plan_tool_cogm: {
		planetNaturalId: string;
		recipeId: string;
	};
	plan_update_building_delete_recipe: {
		planetNaturalId: string;
		buildingTicker: string;
		recipeIndex: number;
	};
	plan_update_building_add_recipe: {
		planetNaturalId: string;
		buildingTicker: string;
	};
	plan_update_building_change_recipe: {
		planetNaturalId: string;
		buildingTicker: string;
		recipeId: string;
	};
	plan_update_workforce: {
		planetNaturalId: string;
		workforceType: WORKFORCE_TYPE;
		luxType: string;
		value: boolean;
	};
	plan_tool_optimize_habitation: {
		applyType: "auto" | "area" | "cost";
	};
	plan_tool_optimize_habitation_active: {
		active: boolean;
	};
	plan_show_configuration: {
		visible: boolean;
	};
	xit_burn_fit_ship: {
		weight: number;
		volume: number;
	};
}
