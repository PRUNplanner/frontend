import { IPreferenceDefault } from "@/features/preferences/userPreferences.types";

/**
 * Defines default values for user preferences, contains generic tool
 * defaults as well as the values for individual plan settings defaults
 *
 * @author jplacht
 *
 * @type {IPreferenceDefault}
 */
export const preferenceDefaults: IPreferenceDefault = {
	locale: "en_US",
	defaultEmpireUuid: undefined,
	defaultCXUuid: undefined,
	defaultBuyItemsFromCX: true,
	burnDaysRed: 5,
	burnDaysYellow: 10,
	burnResupplyDays: 20,
	burnOrigin: "Configure on Execution",
	burnDefaultMode: "simple",
	burnFullCoverThreshold: 1.0,
	layoutNavigationStyle: "full",

	planOverrides: {},
	planDefaults: {
		includeCM: false,
		visitationMaterialExclusions: [],
		// Auto-optimize habs is true by default for new plans, that value will
		// be stored into the prefs on saving. But for existing plans, we want it
		// to be false by default
		autoOptimizeHabs: false,
	},
};
