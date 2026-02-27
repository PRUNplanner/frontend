import {
	IQueryDefinition,
	JSONValue,
} from "@/lib/query_cache/queryCache.types";
import {
	IBuilding,
	IExchange,
	IFIOStorage,
	IMaterial,
	IPlanet,
	IPlanetSearchAdvanced,
	IPopulationReport,
	IRecipe,
} from "@/features/api/gameData.types";

import {
	ICXEmpireJunction,
	IPlanCloneResponse,
	IPlanEmpireJunction,
} from "@/features/manage/manage.types";
import {
	ICX,
	ICXData,
	ICXPut,
	IPlan,
	IPlanEmpire,
	IPlanEmpireElement,
	IPlanShare,
} from "@/stores/planningStore.types";

import {
	IShared,
	ISharedCloneResponse,
	ISharedCreateResponse,
} from "@/features/api/sharingData.types";

import { IExploration } from "@/features/market_exploration/marketExploration.types";
import {
	IEmpireCreatePayload,
	IEmpirePatchPayload,
} from "@/features/empire/empire.types";
import {
	IPlanCreateData,
	IPlanSaveData,
} from "@/features/planning_data/usePlan.types";
import { PlanSaveCreateResponseType } from "@/features/api/schemas/planningData.schemas";
import {
	IUserAPIKey,
	IUserAPIKeyCreatePayload,
	IUserChangePasswordPayload,
	IUserRequestPasswordResetResponse,
	IUserProfile,
	IUserProfilePatch,
	IUserRegistrationPayload,
	IUserVerifyEmailPayload,
	IUserRequestPasswordResetPayload,
	IUserPasswordResetPayload,
	IUserPasswordResetResponse,
	IUserResponseDetail,
	IUserRegistrationResponse,
} from "@/features/api/userData.types";
import { IPreference } from "@/features/preferences/userPreferences.types";

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
	GetMaterials: IQueryDefinition<undefined, IMaterial[]>;
	GetExchanges: IQueryDefinition<undefined, IExchange[]>;
	GetRecipes: IQueryDefinition<undefined, IRecipe[]>;
	GetBuildings: IQueryDefinition<undefined, IBuilding[]>;
	GetPlanet: IQueryDefinition<{ planetNaturalId: string }, IPlanet>;
	GetMultiplePlanets: IQueryDefinition<
		{ planetNaturalIds: string[] },
		IPlanet[]
	>;
	GetPlanetSearchSingle: IQueryDefinition<{ searchId: string }, IPlanet[]>;
	PostPlanetSearch: IQueryDefinition<
		{ searchData: IPlanetSearchAdvanced },
		IPlanet[]
	>;
	GetSharedPlan: IQueryDefinition<{ sharedPlanUuid: string }, IPlanShare>;
	GetAllShared: IQueryDefinition<undefined, IShared[]>;
	DeleteSharedPlan: IQueryDefinition<{ sharedUuid: string }, boolean>;
	CreateSharedPlan: IQueryDefinition<
		{ planUuid: string },
		ISharedCreateResponse
	>;
	PutCloneSharedPlan: IQueryDefinition<
		{ sharedUuid: string },
		ISharedCloneResponse
	>;
	CreateEmpire: IQueryDefinition<{ data: IEmpireCreatePayload }, IPlanEmpire>;
	DeleteEmpire: IQueryDefinition<{ empireUuid: string }, boolean>;
	PatchEmpireCXJunctions: IQueryDefinition<
		{ junctions: ICXEmpireJunction[] },
		ICX[]
	>;
	PatchCX: IQueryDefinition<
		{ cxName: string; cxUuid: string; data: ICXData },
		ICXPut
	>;
	GetAllEmpires: IQueryDefinition<undefined, IPlanEmpireElement[]>;
	GetEmpirePlans: IQueryDefinition<{ empireUuid: string }, IPlan[]>;
	PatchEmpire: IQueryDefinition<
		{ empireUuid: string; data: IEmpirePatchPayload },
		IPlanEmpire
	>;
	PatchEmpirePlanJunctions: IQueryDefinition<
		{ junctions: IPlanEmpireJunction[] },
		IPlanEmpireElement[]
	>;
	CreateCX: IQueryDefinition<{ cxName: string }, ICX>;
	DeleteCX: IQueryDefinition<{ cxUuid: string }, boolean>;
	GetAllCX: IQueryDefinition<undefined, ICX[]>;
	GetPlan: IQueryDefinition<{ planUuid: string }, IPlan>;
	GetAllPlans: IQueryDefinition<undefined, IPlan[]>;
	ClonePlan: IQueryDefinition<
		{ planUuid: string; cloneName: string },
		IPlanCloneResponse
	>;
	DeletePlan: IQueryDefinition<{ planUuid: string }, boolean>;
	CreatePlan: IQueryDefinition<
		{ data: IPlanCreateData },
		PlanSaveCreateResponseType
	>;
	PatchPlan: IQueryDefinition<
		{ planUuid: string; data: IPlanSaveData },
		PlanSaveCreateResponseType
	>;
	GetExplorationData: IQueryDefinition<
		{
			exchangeTicker: string;
			materialTicker: string;
		},
		IExploration[]
	>;
	GetFIOStorage: IQueryDefinition<undefined, IFIOStorage>;
	// GetFIOSites: IQueryDefinition<undefined, IFIOSites>;
	GetPlanetLastPOPR: IQueryDefinition<
		{ planetNaturalId: string },
		IPopulationReport
	>;
	PatchUserProfile: IQueryDefinition<IUserProfilePatch, IUserProfile>;
	PostUserResendEmailVerification: IQueryDefinition<
		null,
		IUserResponseDetail
	>;
	PatchUserChangePassword: IQueryDefinition<
		IUserChangePasswordPayload,
		boolean
	>;
	PostUserVerifyEmail: IQueryDefinition<IUserVerifyEmailPayload, boolean>;
	GetUserAPIKeyList: IQueryDefinition<undefined, IUserAPIKey[]>;
	PostUserCreateAPIKey: IQueryDefinition<IUserAPIKeyCreatePayload, boolean>;
	DeleteUserAPIKey: IQueryDefinition<{ key: string }, boolean>;
	PostUserRegistration: IQueryDefinition<
		IUserRegistrationPayload,
		IUserRegistrationResponse
	>;
	PostUserRequestPasswordReset: IQueryDefinition<
		IUserRequestPasswordResetPayload,
		IUserRequestPasswordResetResponse
	>;
	PostUserPasswordReset: IQueryDefinition<
		IUserPasswordResetPayload,
		IUserPasswordResetResponse
	>;
	PatchPreferences: IQueryDefinition<IPreference, IPreference>;
	GetPreferences: IQueryDefinition<undefined, IPreference>;
}
