import type {
	PreferencePerPlan,
	UserPreference,
} from "@/features/api/schemas/user.schemas";

export interface IPreferenceDefault extends UserPreference {
	planDefaults: PreferencePerPlan;
}

export interface IPlanPreferenceOverview {
	planUuid: string;
	planetId: string;
	planName: string;
	preferences: string[];
}
