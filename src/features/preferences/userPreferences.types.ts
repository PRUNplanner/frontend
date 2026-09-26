import { SupportedLocale } from "@/lib/i18n";

export interface IPreferencePerPlan {
	includeCM?: boolean;
	visitationMaterialExclusions?: string[];
	autoOptimizeHabs: boolean;
}

export interface IPreference {
	locale: SupportedLocale;
	defaultEmpireUuid: string | undefined;
	defaultCXUuid: string | undefined;
	defaultBuyItemsFromCX: boolean;
	burnDaysRed: number;
	burnDaysYellow: number;
	burnResupplyDays: number;
	burnOrigin: string;
	burnDefaultMode: "simple" | "solver";
	burnFullCoverThreshold: number;
	layoutNavigationStyle: "full" | "collapsed";

	// seeding per plan defaults
	planOverrides: Record<string, Partial<IPreferencePerPlan>>;

	[key: string]:
		| string
		| undefined
		| number
		| boolean
		| Record<string, Partial<IPreferencePerPlan>>
		| IPreferencePerPlan;
}

export interface IPreferenceDefault extends IPreference {
	planDefaults: IPreferencePerPlan;
}

export interface IPlanPreferenceOverview {
	planUuid: string;
	planetId: string;
	planName: string;
	preferences: string[];
}
