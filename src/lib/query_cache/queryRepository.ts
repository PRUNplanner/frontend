import { IQueryDefinition } from "@/lib/query_cache/queryCache.types";

// i18n
import { i18n } from "@/lib/i18n";

// config
import config from "@/lib/config";

import { trackEvent } from "@/lib/analytics/useAnalytics";

// stores
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";

// indexeddb
import {
	materialsStore,
	planetsStore,
	exchangesStore,
	recipesStore,
	buildingsStore,
} from "@/database/stores";
import { useDB } from "@/database/composables/useDB";

// API Calls
import {
	callDataBuildings,
	callDataExchanges,
	callDataFIOStorage,
	callDataMaterials,
	callDataMultiplePlanets,
	callDataPlanet,
	callDataPlanetSearch,
	callDataPlanetSearchSingle,
	callDataRecipes,
	callExplorationData,
	callPlanetLastPOPR,
} from "@/features/api/gameData.api";
import {
	callClonePlan,
	callCreatePlan,
	callDeletePlan,
	callGetPlan,
	callGetPlanlist,
	callGetShared,
	callSavePlan,
} from "@/features/api/planData.api";
import {
	callCreateEmpire,
	callDeleteEmpire,
	callGetEmpireList,
	callGetEmpirePlans,
	callPatchEmpire,
	callPatchEmpirePlanJunctions,
	callPatchEmpireState,
} from "@/features/api/empireData.api";
import {
	callCreateCX,
	callDeleteCX,
	callGetCXList,
	callPatchCX,
	callUpdateCXJunctions,
} from "@/features/api/cxData.api";
import {
	callCloneSharedPlan,
	callCreateSharing,
	callDeleteSharing,
	callGetSharedList,
} from "@/features/api/sharingData.api";

// Types & Interfaces
import { IQueryRepository } from "@/lib/query_cache/queryRepository.types";

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

import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";
import {
	callChangePassword,
	callGetUserPreferences,
	callPasswordReset,
	callPatchProfile,
	callPatchUserPreferences,
	callRegisterUser,
	callRequestPasswordReset,
	callResendEmailVerification,
	callVerifyEmail,
} from "@/features/api/userData.api";
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
import { callAnalyticsPlanetInsights } from "@/features/api/analyticsData.api";
import {
	callDeleteAPIKey,
	callGetAPIKeys,
	callPostCreateAPIKey,
} from "@/features/api/apiKeysData.api";
import type {
	APIKey,
	APIKeyCreatePayload,
	APIKeyCreateResponse,
} from "@/features/api/schemas/apiKeysData.schemas";
import { Composer } from "vue-i18n";

export function useQueryRepository() {
	const queryStore = useQueryStore();
	const planningStore = usePlanningStore();
	const userStore = useUserStore();

	const repository: IQueryRepository = {
		GetMaterials: {
			key: () => ["gamedata", "materials"],
			fetchFn: async () => {
				const data: Material[] = await callDataMaterials();
				await materialsStore.setMany(data, true);
				await useDB(materialsStore).preload(true);

				return data;
			},
			autoRefetch: true,
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_MATERIALS,
			persist: true,
		} as IQueryDefinition<undefined, Material[]>,
		GetExchanges: {
			key: () => ["gamedata", "exchanges"],
			fetchFn: async () => {
				const data: Exchange[] = await callDataExchanges();
				await exchangesStore.setMany(data, true);
				await useDB(exchangesStore).preload(true);

				return data;
			},
			autoRefetch: true,
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_EXCHANGES,
			persist: true,
		} as IQueryDefinition<undefined, Exchange[]>,
		GetRecipes: {
			key: () => ["gamedata", "recipes"],
			fetchFn: async () => {
				const data: Recipe[] = await callDataRecipes();
				await recipesStore.setMany(data, true);
				await useDB(recipesStore).preload(true);

				return data;
			},
			autoRefetch: true,
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_RECIPES,
			persist: true,
		} as IQueryDefinition<undefined, Recipe[]>,
		GetBuildings: {
			key: () => ["gamedata", "buildings"],
			fetchFn: async () => {
				const data: Building[] = await callDataBuildings();
				await buildingsStore.setMany(data, true);
				await useDB(buildingsStore).preload(true);
				return data;
			},
			autoRefetch: true,
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_BUILDINGS,
			persist: true,
		} as IQueryDefinition<undefined, Building[]>,
		GetPlanet: {
			key: (params: { planetNaturalId: string }) => [
				"gamedata",
				"planet",
				params.planetNaturalId,
			],
			fetchFn: async (params: { planetNaturalId: string }) => {
				const data: Planet = await callDataPlanet(
					params.planetNaturalId
				);
				await planetsStore.set(data);
				await useDB(planetsStore).preload(true);

				return data;
			},
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_PLANETS,
			autoRefetch: true,
			persist: true,
		} as IQueryDefinition<{ planetNaturalId: string }, Planet>,
		GetMultiplePlanets: {
			key: (params: { planetNaturalIds: string[] }) => [
				"gamedata",
				"planet",
				"multiple",
				params.planetNaturalIds,
			],
			fetchFn: async (params: { planetNaturalIds: string[] }) => {
				try {
					const data: Planet[] = await callDataMultiplePlanets(
						params.planetNaturalIds
					);

					// set in indexeddb
					await planetsStore.setMany(data);
					await useDB(planetsStore).preload(true);

					// set plans individually
					data.forEach((p) => {
						queryStore.addCacheState(
							["gamedata", "planet", p.planet_natural_id],
							"GetPlanet",
							{ planetNaturalId: p.planet_natural_id },
							p
						);
					});

					return data;
				} catch {
					return [];
				}
			},
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_PLANETS,
			autoRefetch: true,
			persist: true,
		} as IQueryDefinition<{ planetNaturalIds: string[] }, Planet[]>,
		GetPlanetSearchSingle: {
			key: (params: { searchId: string }) => [
				"gamedata",
				"planet",
				"search",
				params.searchId,
			],
			fetchFn: async (params: { searchId: string }) => {
				const data = await callDataPlanetSearchSingle(params.searchId);

				await planetsStore.setMany(data);
				await useDB(planetsStore).preload(true);

				return data;
			},
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_PLANETS,
			persist: true,
			autoRefetch: false,
		} as IQueryDefinition<{ searchId: string }, Planet[]>,
		PostPlanetSearch: {
			key: (params: { searchData: PlanetSearchAdvancedPayload }) => [
				"gamedata",
				"planet",
				"search",
				params.searchData,
			],
			fetchFn: async (params: {
				searchData: PlanetSearchAdvancedPayload;
			}) => {
				const data = await callDataPlanetSearch(params.searchData);

				await planetsStore.setMany(data);
				await useDB(planetsStore).preload(true);

				return data;
			},
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_PLANETS,
			persist: true,
			autoRefetch: false,
		} as IQueryDefinition<
			{ searchData: PlanetSearchAdvancedPayload },
			Planet[]
		>,
		GetSharedPlan: {
			key: (params: { sharedPlanUuid: string }) => [
				"planningdata",
				"shared",
				params.sharedPlanUuid,
			],
			fetchFn: async (params: { sharedPlanUuid: string }) => {
				return await callGetShared(params.sharedPlanUuid);
			},
			persist: true,
			autoRefetch: false,
			expireTime: 10_000,
		} as IQueryDefinition<{ sharedPlanUuid: string }, PlanShare>,
		GetAllShared: {
			key: () => ["planningdata", "shared", "list"],
			fetchFn: async () => {
				const data = await callGetSharedList();
				planningStore.setSharedList(data);
				return data;
			},
			persist: true,
			autoRefetch: true,
			expireTime: 60_000 * 60,
		} as IQueryDefinition<void, Shared[]>,
		DeleteSharedPlan: {
			key: (params: { sharedUuid: string }) => [
				"planningdata",
				"shared",
				"delete",
				params.sharedUuid,
			],
			fetchFn: async (params: { sharedUuid: string }) => {
				const data = await callDeleteSharing(params.sharedUuid);
				await queryStore.invalidateKey(["planningdata", "shared"], {
					exact: false,
					skipRefetch: true,
				});
				return data;
			},
			persist: false,
			autoRefetch: false,
		} as IQueryDefinition<{ sharedUuid: string }, boolean>,
		CreateSharedPlan: {
			key: (params: { planUuid: string }) => [
				"planningdata",
				"shared",
				"create",
				params.planUuid,
			],
			fetchFn: async (params: { planUuid: string }) => {
				await queryStore.invalidateKey(["planningdata", "shared"], {
					exact: false,
					skipRefetch: true,
				});
				return await callCreateSharing(params.planUuid);
			},
			persist: false,
			autoRefetch: false,
		} as IQueryDefinition<{ planUuid: string }, SharedCreateResponse>,
		PostCloneSharedPlan: {
			key: (params: { sharedUuid: string }) => [
				"planningdata",
				"shared",
				"clone",
				params.sharedUuid,
			],
			fetchFn: async (params: { sharedUuid: string }) => {
				await queryStore.invalidateKey(["planningdata", "shared"], {
					exact: false,
					skipRefetch: true,
				});
				return await callCloneSharedPlan(params.sharedUuid);
			},
			persist: false,
			autoRefetch: false,
		} as IQueryDefinition<{ sharedUuid: string }, SharedCloneResponse>,
		CreateEmpire: {
			key: () => ["planningdata", "empire", "create"],
			fetchFn: async (params: { data: EmpirePayload }) => {
				const data = await callCreateEmpire(params.data);
				await queryStore.invalidateKey(["planningdata", "empire"], {
					exact: false,
				});
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ data: EmpirePayload }, PlanEmpire>,
		DeleteEmpire: {
			key: (params: { empireUuid: string }) => [
				"planningdata",
				"empire",
				"delete",
				params.empireUuid,
			],
			fetchFn: async (params: { empireUuid: string }) => {
				const data = await callDeleteEmpire(params.empireUuid);
				await queryStore.invalidateKey(["planningdata", "empire"], {
					exact: false,
				});
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ empireUuid: string }, boolean>,
		PatchEmpireCXJunctions: {
			key: () => ["planningdata", "empire", "cx", "junctions"],
			fetchFn: async (params: { junctions: CXEmpireJunction[] }) => {
				const data = await callUpdateCXJunctions(params.junctions);
				await queryStore.invalidateKey(["planningdata", "empire"], {
					exact: false,
				});
				await queryStore.invalidateKey(["planningdata", "cx"], {
					exact: false,
				});
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ junctions: CXEmpireJunction[] }, CX[]>,
		PatchEmpireState: {
			key: (params: { empireUuid: string }) => [
				"planningdata",
				"empire",
				"state",
				params.empireUuid,
			],
			fetchFn: async (params: {
				empireUuid: string;
				empireState: EmpireMaterialIOState;
			}) => {
				return await callPatchEmpireState(
					params.empireUuid,
					params.empireState
				);
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<
			{ empireUuid: string; empireState: EmpireMaterialIOState },
			PlanEmpire
		>,
		PatchCX: {
			key: (params: { cxUuid: string }) => [
				"planningdata",
				"cx",
				"patch",
				params.cxUuid,
			],
			fetchFn: async (params: {
				cxName: string;
				cxUuid: string;
				data: CXData;
			}) => {
				const data = await callPatchCX(
					params.cxName,
					params.cxUuid,
					params.data
				);
				await queryStore.invalidateKey(["planningdata", "cx"], {
					exact: false,
				});

				planningStore.setCX(params.cxUuid, data.cx_name, data.cx_data);

				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<
			{ cxName: string; cxUuid: string; data: CXData },
			CX
		>,
		GetAllEmpires: {
			key: () => ["planningdata", "empire", "list"],
			fetchFn: async () => {
				const data = await callGetEmpireList();
				planningStore.setEmpires(data);
				return data;
			},
			autoRefetch: false,
			persist: true,
		} as IQueryDefinition<void, PlanEmpireElement[]>,
		GetEmpirePlans: {
			key: (params: { empireUuid: string }) => [
				"planningdata",
				"empire",
				"plans",
				params.empireUuid,
			],
			fetchFn: async (params: { empireUuid: string }) => {
				try {
					const data = await callGetEmpirePlans(params.empireUuid);

					planningStore.setPlans(data);

					// manually set individual plans
					data.forEach((p) =>
						queryStore.addCacheState(
							["planningdata", "plan", p.uuid],
							"GetPlan",
							{ planUuid: p.uuid },
							p
						)
					);

					return data;
				} catch {
					return [];
				}
			},
			autoRefetch: false,
			persist: true,
		} as IQueryDefinition<{ empireUuid: string }, Plan[]>,
		PatchEmpire: {
			key: (params: { empireUuid: string }) => [
				"planningdata",
				"empire",
				"patch",
				params.empireUuid,
			],
			fetchFn: async (params: {
				empireUuid: string;
				data: EmpirePayload;
			}) => {
				const data = await callPatchEmpire(
					params.empireUuid,
					params.data
				);
				await queryStore.invalidateKey(["planningdata", "empire"], {
					exact: false,
				});
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<
			{ empireUuid: string; data: EmpirePayload },
			PlanEmpire
		>,
		PatchEmpirePlanJunctions: {
			key: () => ["planningdata", "empire", "plan", "junctions"],
			fetchFn: async (params: { junctions: PlanEmpireJunction[] }) => {
				const data = await callPatchEmpirePlanJunctions(
					params.junctions
				);

				// invalidate empires + all plans as junctions might have changed
				await queryStore.invalidateKey(["planningdata", "empire"], {
					exact: false,
				});
				await queryStore.invalidateKey(["planningdata", "plan"], {
					exact: false,
				});

				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<
			{ junctions: PlanEmpireJunction[] },
			PlanEmpireElement[]
		>,
		CreateCX: {
			key: () => ["planningdata", "cx", "create"],
			fetchFn: async (params: { cxName: string }) => {
				const data = await callCreateCX(params.cxName);
				await queryStore.invalidateKey(["planningdata", "cx"], {
					exact: false,
				});
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ cxName: string }, CX>,
		DeleteCX: {
			key: (params: { cxUuid: string }) => [
				"planningdata",
				"cx",
				"delete",
				params.cxUuid,
			],
			fetchFn: async (params: { cxUuid: string }) => {
				const data = await callDeleteCX(params.cxUuid);
				await queryStore.invalidateKey(["planningdata", "cx"], {
					exact: false,
				});
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ cxUuid: string }, boolean>,
		GetAllCX: {
			key: () => ["planningdata", "cx"],
			fetchFn: async () => {
				const data = await callGetCXList();
				planningStore.setCXs(data);
				return data;
			},
			autoRefetch: false,
			persist: true,
		} as IQueryDefinition<void, CX[]>,
		GetPlan: {
			key: (params: { planUuid: string }) => [
				"planningdata",
				"plan",
				params.planUuid,
			],
			fetchFn: async (params: { planUuid: string }) => {
				const data = await callGetPlan(params.planUuid);
				planningStore.setPlan(data);
				return data;
			},
			autoRefetch: false,
			persist: true,
		} as IQueryDefinition<{ planUuid: string }, Plan>,
		GetAllPlans: {
			key: () => ["planningdata", "plan", "list"],
			fetchFn: async () => {
				try {
					const data = await callGetPlanlist();
					planningStore.setPlans(data);

					// manually set individual plans
					data.forEach((p) =>
						queryStore.addCacheState(
							["planningdata", "plan", p.uuid],
							"GetPlan",
							{ planUuid: p.uuid },
							p
						)
					);

					return data;
				} catch {
					return [];
				}
			},
			autoRefetch: false,
			persist: true,
		} as IQueryDefinition<void, Plan[]>,
		ClonePlan: {
			key: (params: { planUuid: string; cloneName: string }) => [
				"planningdata",
				"plan",
				"clone",
				params.planUuid,
			],
			fetchFn: async (params: {
				planUuid: string;
				cloneName: string;
			}) => {
				return await callClonePlan(
					params.planUuid,
					params.cloneName
				).then(async () => {
					await queryStore.invalidateKey(["planningdata", "empire"], {
						exact: false,
					});
					await queryStore.invalidateKey([
						"planningdata",
						"plan",
						"list",
					]);
				});
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ planUuid: string; cloneName: string }, void>,
		DeletePlan: {
			key: (params: { planUuid: string }) => [
				"planningdata",
				"plan",
				"delete",
				params.planUuid,
			],
			fetchFn: async (params: { planUuid: string }) => {
				return await callDeletePlan(params.planUuid).then(async () => {
					await queryStore.invalidateKey(["planningdata", "empire"], {
						exact: false,
					});
					await queryStore.invalidateKey([
						"planningdata",
						"plan",
						"list",
					]);
					await queryStore.invalidateKey([
						"planningdata",
						"plan",
						params.planUuid,
					]);
					planningStore.deletePlan(params.planUuid);
				});
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ planUuid: string }, boolean>,
		CreatePlan: {
			key: () => ["planningdata", "plan", "create"],
			fetchFn: async (params: { data: PlanCreateData }) => {
				const data = await callCreatePlan(params.data);
				await queryStore.invalidateKey(["planningdata", "plan"], {
					exact: false,
				});
				await queryStore.invalidateKey(["planningdata", "empire"], {
					exact: false,
				});
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ data: PlanCreateData }, PlanSaveCreateResponse>,
		PatchPlan: {
			key: (params: { planUuid: string }) => [
				"planningdata",
				"plan",
				"patch",
				params.planUuid,
			],
			fetchFn: async (params: {
				planUuid: string;
				data: PlanSaveData;
			}) => {
				const data = await callSavePlan(params.planUuid, params.data);
				await queryStore.invalidateKey(["planningdata", "plan"], {
					exact: false,
				});
				await queryStore.invalidateKey(["planningdata", "empire"], {
					exact: false,
				});
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<
			{ planUuid: string; data: PlanSaveData },
			PlanSaveCreateResponse
		>,
		GetExplorationData: {
			key: (params: {
				exchangeTicker: string;
				materialTicker: string;
			}) => [
				"gamedata",
				"marketexploration",
				params.exchangeTicker,
				params.materialTicker,
			],
			fetchFn: async (params: {
				exchangeTicker: string;
				materialTicker: string;
			}) => {
				return await callExplorationData(
					params.exchangeTicker,
					params.materialTicker
				);
			},
			autoRefetch: false,
			persist: true,
			expireTime: 60_000 * 15, // 15 minutes,
		} as IQueryDefinition<
			{
				exchangeTicker: string;
				materialTicker: string;
			},
			Exploration[]
		>,
		GetFIOStorage: {
			key: () => ["gamedata", "fio", "storage"],
			fetchFn: async () => {
				return await callDataFIOStorage().then((data: FIOStorage) => {
					planningStore.setFIOStorageData(data);
					return data;
				});
			},
			autoRefetch: true,
			persist: true,
			expireTime: 60_000 * 5, // 5 minutes
		} as IQueryDefinition<void, FIOStorage>,
		// GetFIOSites: {
		// 	key: () => ["gamedata", "fio", "sites"],
		// 	fetchFn: async () => {
		// 		return await callDataFIOSites().then((data: IFIOSites) => {
		// 			planningStore.setFIOSitesData(data);
		// 			return data;
		// 		});
		// 	},
		// 	autoRefetch: true,
		// 	persist: true,
		// 	expireTime: 60_000 * 15, // 15 minutes
		// } as IQueryDefinition<void, IFIOSites>,
		GetPlanetLastPOPR: {
			key: (params: { planetNaturalId: string }) => [
				"gamedata",
				"planet",
				"popr",
				"last",
				params.planetNaturalId,
			],
			fetchFn: async (params: { planetNaturalId: string }) => {
				return await callPlanetLastPOPR(params.planetNaturalId);
			},
			autoRefetch: false,
			persist: true,
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_PLANETS,
		} as IQueryDefinition<{ planetNaturalId: string }, PopulationReport>,
		PatchUserProfile: {
			key: () => ["user", "profile", "patch"],
			fetchFn: async (params: UserProfilePatch) => {
				const data = await callPatchProfile(params);
				await userStore.performGetProfile();
				return data;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<UserProfilePatch, UserProfile>,
		PostUserResendEmailVerification: {
			key: () => ["user", "verification", "resend"],
			fetchFn: async () => {
				return await callResendEmailVerification();
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<null, UserResponseDetail>,
		PatchUserChangePassword: {
			key: () => ["user", "password", "patch"],
			fetchFn: async (params: UserChangePasswordPayload) => {
				// we skip the actual message just to have a boolean
				try {
					await callChangePassword(params);
					return true;
				} catch {
					return false;
				}
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<UserChangePasswordPayload, boolean>,
		PostUserVerifyEmail: {
			key: () => ["user", "verification", "check"],
			fetchFn: async (params: UserVerifyEmailPayload) => {
				try {
					await callVerifyEmail(params);
					return true;
				} catch {
					return false;
				}
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<UserVerifyEmailPayload, boolean>,
		PostUserRegistration: {
			key: () => ["user", "account", "registration"],
			fetchFn: async (params: UserRegistrationPayload) => {
				trackEvent("user_registration", {
					username: params.username,
				});
				try {
					const response = await callRegisterUser(params);
					return response;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} catch (error: any) {
					const apiErrors = error.responseData;

					if (apiErrors && typeof apiErrors === "object") {
						const firstKey = Object.keys(apiErrors)[0];
						const messages = apiErrors[firstKey];
						const userFriendlyMessage = Array.isArray(messages)
							? messages[0]
							: messages;

						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(error as any).validationFields = userFriendlyMessage;
					}

					throw error;
				}
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<
			UserRegistrationPayload,
			UserRegistrationResponse
		>,
		PostUserRequestPasswordReset: {
			key: () => ["user", "account", "request_password_reset"],
			fetchFn: async (params: UserRequestPasswordResetPayload) => {
				return await callRequestPasswordReset(params.email);
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<
			UserRequestPasswordResetPayload,
			UserResponseDetail
		>,
		PostUserPasswordReset: {
			key: () => ["user", "account", "password_reset"],
			fetchFn: async (params: UserPasswordResetPayload) => {
				try {
					return await callPasswordReset(
						params.email,
						params.code,
						params.new_password
					);
				} catch {
					return {
						detail: "An error occured. Check your Email, Code and Password. Make sure your password is secure.",
					};
				}
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<UserPasswordResetPayload, UserResponseDetail>,
		PatchPreferences: {
			key: () => ["user", "profile", "patch"],
			fetchFn: async (prefs: UserPreference) => {
				// dont try to patch if not logged in, d'oh!
				if (!userStore.isLoggedIn) return;

				return await callPatchUserPreferences(prefs);
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<UserPreference, UserPreference>,
		GetPreferences: {
			key: () => ["user", "profile"],
			fetchFn: async () => {
				const prefs = await callGetUserPreferences();
				Object.assign(userStore.preferences, prefs);

				// handle locale
				const userLocale = userStore.preferences.locale || "en_US";
				userStore
					.setLocale(userLocale, i18n.global as unknown as Composer)
					.catch(console.error);

				return prefs;
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<undefined, UserPreference>,
		GetAnalyticsPlanetInsights: {
			key: (params: { planetNaturalId: string }) => [
				"analytics",
				"planet_insights",
				params.planetNaturalId,
			],
			fetchFn: async (params: { planetNaturalId: string }) => {
				return await callAnalyticsPlanetInsights(
					params.planetNaturalId
				);
			},
			autoRefetch: false,
			persist: true,
			expireTime: 60_000 * config.GAME_DATA_STALE_MINUTES_PLANETS,
		} as IQueryDefinition<
			{ planetNaturalId: string },
			AnalyticsPlanetInsightsPayload
		>,
		GetAPIKeys: {
			key: () => ["user", "api", "keys"],
			fetchFn: async () => {
				return await callGetAPIKeys();
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<undefined, APIKey[]>,
		PostCreateAPIKey: {
			key: () => ["user", "api", "keys", "create"],
			fetchFn: async (params: { name: string }) => {
				return await callPostCreateAPIKey(params.name);
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<APIKeyCreatePayload, APIKeyCreateResponse>,
		DeleteAPIKey: {
			key: () => ["user", "api", "keys", "delete"],
			fetchFn: async (params: { id: string }) => {
				return callDeleteAPIKey(params.id);
			},
			autoRefetch: false,
			persist: false,
		} as IQueryDefinition<{ id: string }, boolean>,
	};

	return {
		repository,
	};
}
