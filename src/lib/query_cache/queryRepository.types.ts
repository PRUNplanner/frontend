import {
	IQueryDefinition,
	JSONValue,
} from "@/lib/query_cache/queryCache.types";
import type {
	Building,
	Exchange,
	FIOStorage,
	Material,
	Planet,
	PlanetSearchAdvancedPayload,
	PopulationReport,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";

import type {
	CX,
	CXData,
	CXEmpireJunction,
} from "@/features/api/schemas/cxData.schemas";
import type {
	EmpireMaterialIOState,
	EmpirePayload,
	PlanEmpireElement,
	PlanEmpireJunction,
} from "@/features/api/schemas/empireData.schemas";
import type {
	Plan,
	PlanCreateData,
	PlanEmpire,
	PlanSaveCreateResponse,
	PlanSaveData,
	PlanShare,
} from "@/features/api/schemas/planningData.schemas";

import type {
	Shared,
	SharedCloneResponse,
	SharedCreateResponse,
} from "@/features/api/schemas/sharingData.schemas";

import { IExploration } from "@/features/market_exploration/marketExploration.types";
import type {
	UserChangePasswordPayload,
	UserPasswordResetPayload,
	UserPreference,
	UserProfile,
	UserProfilePatch,
	UserRegistrationPayload,
	UserRegistrationResponse,
	UserRequestPasswordResetPayload,
	UserResponseDetail,
	UserVerifyEmailPayload,
} from "@/features/api/schemas/user.schemas";
import type { AnalyticsPlanetInsightsPayload } from "@/features/api/schemas/analyticsData.schemas";
import type {
	APIKey,
	APIKeyCreatePayload,
	APIKeyCreateResponse,
} from "@/features/api/schemas/apiKeysData.schemas";
/*
 * To be honest, this typing for Query Params and their data is a complete
 * shitshow, I'm still not 100 % sure why this is working, but if someone
 * is able to make this easier and more readable, please do! /jplacht
 */

export type ParamsOfDefinition<Q> = Q extends {
	key: (params: infer P) => JSONValue;
}
	? P
	: Q extends IQueryDefinition<infer P, unknown>
		? P
		: never;

export type DataOfDefinition<Q> =
	Q extends IQueryDefinition<infer _, infer D>
		? D
		: Q extends { fetchFn: (...args: unknown[]) => Promise<infer D> }
			? D
			: Q extends { fetchFn: (...args: unknown[]) => infer D }
				? D
				: never;

export interface IQueryRepository {
	GetMaterials: IQueryDefinition<undefined, Material[]>;
	GetExchanges: IQueryDefinition<undefined, Exchange[]>;
	GetRecipes: IQueryDefinition<undefined, Recipe[]>;
	GetBuildings: IQueryDefinition<undefined, Building[]>;
	GetPlanet: IQueryDefinition<{ planetNaturalId: string }, Planet>;
	GetMultiplePlanets: IQueryDefinition<
		{ planetNaturalIds: string[] },
		Planet[]
	>;
	GetPlanetSearchSingle: IQueryDefinition<{ searchId: string }, Planet[]>;
	PostPlanetSearch: IQueryDefinition<
		{ searchData: PlanetSearchAdvancedPayload },
		Planet[]
	>;
	GetSharedPlan: IQueryDefinition<{ sharedPlanUuid: string }, PlanShare>;
	GetAllShared: IQueryDefinition<undefined, Shared[]>;
	DeleteSharedPlan: IQueryDefinition<{ sharedUuid: string }, boolean>;
	CreateSharedPlan: IQueryDefinition<
		{ planUuid: string },
		SharedCreateResponse
	>;
	PostCloneSharedPlan: IQueryDefinition<
		{ sharedUuid: string },
		SharedCloneResponse
	>;
	CreateEmpire: IQueryDefinition<{ data: EmpirePayload }, PlanEmpire>;
	DeleteEmpire: IQueryDefinition<{ empireUuid: string }, boolean>;
	PatchEmpireCXJunctions: IQueryDefinition<
		{ junctions: CXEmpireJunction[] },
		CX[]
	>;
	PatchCX: IQueryDefinition<
		{ cxName: string; cxUuid: string; data: CXData },
		CX
	>;
	GetAllEmpires: IQueryDefinition<undefined, PlanEmpireElement[]>;
	GetEmpirePlans: IQueryDefinition<{ empireUuid: string }, Plan[]>;
	PatchEmpire: IQueryDefinition<
		{ empireUuid: string; data: EmpirePayload },
		PlanEmpire
	>;
	PatchEmpirePlanJunctions: IQueryDefinition<
		{ junctions: PlanEmpireJunction[] },
		PlanEmpireElement[]
	>;
	PatchEmpireState: IQueryDefinition<
		{ empireUuid: string; empireState: EmpireMaterialIOState },
		PlanEmpire
	>;
	CreateCX: IQueryDefinition<{ cxName: string }, CX>;
	DeleteCX: IQueryDefinition<{ cxUuid: string }, boolean>;
	GetAllCX: IQueryDefinition<undefined, CX[]>;
	GetPlan: IQueryDefinition<{ planUuid: string }, Plan>;
	GetAllPlans: IQueryDefinition<undefined, Plan[]>;
	ClonePlan: IQueryDefinition<{ planUuid: string; cloneName: string }, void>;
	DeletePlan: IQueryDefinition<{ planUuid: string }, boolean>;
	CreatePlan: IQueryDefinition<
		{ data: PlanCreateData },
		PlanSaveCreateResponse
	>;
	PatchPlan: IQueryDefinition<
		{ planUuid: string; data: PlanSaveData },
		PlanSaveCreateResponse
	>;
	GetExplorationData: IQueryDefinition<
		{
			exchangeTicker: string;
			materialTicker: string;
		},
		IExploration[]
	>;
	GetFIOStorage: IQueryDefinition<undefined, FIOStorage>;
	// GetFIOSites: IQueryDefinition<undefined, IFIOSites>;
	GetPlanetLastPOPR: IQueryDefinition<
		{ planetNaturalId: string },
		PopulationReport
	>;
	PatchUserProfile: IQueryDefinition<UserProfilePatch, UserProfile>;
	PostUserResendEmailVerification: IQueryDefinition<null, UserResponseDetail>;
	PatchUserChangePassword: IQueryDefinition<
		UserChangePasswordPayload,
		boolean
	>;
	PostUserVerifyEmail: IQueryDefinition<UserVerifyEmailPayload, boolean>;
	PostUserRegistration: IQueryDefinition<
		UserRegistrationPayload,
		UserRegistrationResponse
	>;
	PostUserRequestPasswordReset: IQueryDefinition<
		UserRequestPasswordResetPayload,
		UserResponseDetail
	>;
	PostUserPasswordReset: IQueryDefinition<
		UserPasswordResetPayload,
		UserResponseDetail
	>;
	PatchPreferences: IQueryDefinition<UserPreference, UserPreference>;
	GetPreferences: IQueryDefinition<undefined, UserPreference>;
	GetAnalyticsPlanetInsights: IQueryDefinition<
		{ planetNaturalId: string },
		AnalyticsPlanetInsightsPayload
	>;
	GetAPIKeys: IQueryDefinition<undefined, APIKey[]>;
	PostCreateAPIKey: IQueryDefinition<
		APIKeyCreatePayload,
		APIKeyCreateResponse
	>;
	DeleteAPIKey: IQueryDefinition<{ id: string }, boolean>;
}
