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
	layoutNavigationStyle: "full" | "collapsed";

	/**
	 * Share of an exchange's daily traded volume, in percent, at which a
	 * plan's sale of a material is flagged yellow respectively red.
	 * Optional and client side only: deliberately absent from
	 * `UserPreferenceSchema`, so it never reaches the backend
	 */
	cxVolumeYellowPercent?: number;
	cxVolumeRedPercent?: number;

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
