/**
 * Contract tests against the backend (PRUNplanner/backend).
 *
 * The per-endpoint API tests mock responses with frontend-shaped fixtures,
 * so they can't notice when frontend and backend drift apart. These tests
 * pin what the frontend sends and which backend shapes it must accept.
 */
import { describe, it, expect, beforeEach } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";

import { apiService } from "@/lib/apiService";
import {
	callCreateCX,
	callDeleteCX,
	callPatchCX,
	callUpdateCXJunctions,
} from "@/features/api/cxData.api";
import {
	callCreateEmpire,
	callDeleteEmpire,
	callPatchEmpire,
	callPatchEmpirePlanJunctions,
} from "@/features/api/empireData.api";
import { callClonePlan, callDeletePlan } from "@/features/api/planData.api";
import {
	callCloneSharedPlan,
	callCreateSharing,
	callDeleteSharing,
} from "@/features/api/sharingData.api";
import {
	callDeleteAPIKey,
	callPostCreateAPIKey,
} from "@/features/api/apiKeysData.api";
import {
	callChangePassword,
	callPasswordReset,
	callPatchUserPreferences,
	callRefreshToken,
	callRegisterUser,
	callRequestPasswordReset,
	callUserLogin,
	callVerifyEmail,
} from "@/features/api/userData.api";
import { UserPreferenceSchema } from "@/features/api/schemas/user.schemas";
import {
	FIOStorageSchema,
	PlanetSchema,
} from "@/features/api/schemas/gameData.schemas";
import { ExplorationPayloadSchema } from "@/features/market_exploration/marketExploration.schemas";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// test data
import planet_single from "@/tests/test_data/api_data_planet_single.json";

const mock = new AxiosMockAdapter(apiService.client);

const UUID = "f39c84a5-e7ba-4aeb-a04d-0618df58fd74";
// refresh tokens are JWTs, the payload schema requires 120+ chars
const REFRESH_TOKEN = "r".repeat(120);

type Method = "get" | "post" | "put" | "patch" | "delete";

/** Fields of a multipart body, axios uses the `form-data` package in node */
function formFields(
	form: FormData | { getBuffer(): Buffer }
): Record<string, string> {
	if (!("getBuffer" in form))
		return Object.fromEntries(form) as Record<string, string>;

	const text = form.getBuffer().toString();
	return Object.fromEntries(
		[...text.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)/g)].map((m) => [
			m[1],
			m[2],
		])
	);
}

/** Last request of a method as sent over the wire */
function lastRequest(method: Method) {
	const request = mock.history[method].at(-1);
	return {
		url: request?.url,
		// JSON arrives as string, multipart forms as FormData
		body:
			typeof request?.data === "string"
				? JSON.parse(request.data)
				: request?.data
					? formFields(request.data)
					: undefined,
	};
}

describe("Backend contract", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		mock.reset();
		mock.resetHistory();
		// replies are irrelevant here, only the requests are checked
		mock.onAny().reply(200, {});
	});

	describe("requests", () => {
		const cases: {
			name: string;
			call: () => Promise<unknown>;
			method: Method;
			url: string;
			body?: unknown;
		}[] = [
			{
				name: "create cx",
				call: () => callCreateCX("My CX"),
				method: "post",
				url: "/planning/cx/",
				body: {
					cx_name: "My CX",
					cx_data: {
						cx_empire: [],
						cx_planets: [],
						ticker_empire: [],
						ticker_planets: [],
					},
				},
			},
			{
				name: "patch cx",
				call: () =>
					callPatchCX("My CX", UUID, {
						cx_empire: [],
						cx_planets: [],
						ticker_empire: [],
						ticker_planets: [],
					}),
				method: "put",
				url: `/planning/cx/${UUID}/`,
				body: {
					cx_name: "My CX",
					cx_data: {
						cx_empire: [],
						cx_planets: [],
						ticker_empire: [],
						ticker_planets: [],
					},
				},
			},
			{
				name: "delete cx",
				call: () => callDeleteCX(UUID),
				method: "delete",
				url: `/planning/cx/${UUID}/`,
			},
			{
				name: "cx junctions",
				call: () => callUpdateCXJunctions([]),
				method: "post",
				url: "/planning/cx/junctions/",
				body: [],
			},
			{
				name: "create empire",
				call: () =>
					callCreateEmpire({
						empire_name: "Empire",
						// lower case is normalized before sending
						empire_faction: "antares" as never,
						empire_permits_used: 1,
						empire_permits_total: 2,
					}),
				method: "post",
				url: "/planning/empire/",
				body: {
					empire_name: "Empire",
					empire_faction: "ANTARES",
					empire_permits_used: 1,
					empire_permits_total: 2,
				},
			},
			{
				name: "patch empire",
				call: () =>
					callPatchEmpire(UUID, {
						empire_name: "Empire",
						empire_faction: "NONE",
						empire_permits_used: 3,
						empire_permits_total: 4,
					}),
				method: "put",
				url: `planning/empire/${UUID}/`,
				body: {
					empire_name: "Empire",
					empire_faction: "NONE",
					empire_permits_used: 3,
					empire_permits_total: 4,
				},
			},
			{
				name: "delete empire",
				call: () => callDeleteEmpire(UUID),
				method: "delete",
				url: `/planning/empire/${UUID}/`,
			},
			{
				name: "empire plan junctions",
				call: () =>
					callPatchEmpirePlanJunctions([
						{
							empire_uuid: UUID,
							baseplanners: [{ baseplanner_uuid: UUID }],
						},
					]),
				method: "post",
				url: "/planning/empire/junctions/",
				body: [
					{
						empire_uuid: UUID,
						baseplanners: [{ baseplanner_uuid: UUID }],
					},
				],
			},
			{
				name: "clone plan",
				call: () => callClonePlan(UUID, "Copy"),
				method: "post",
				url: `/planning/plan/${UUID}/clone/`,
				body: { plan_name: "Copy" },
			},
			{
				name: "delete plan",
				call: () => callDeletePlan(UUID),
				method: "delete",
				url: `/planning/plan/${UUID}/`,
			},
			{
				name: "create sharing",
				call: () => callCreateSharing(UUID),
				method: "post",
				url: "/planning/shared/",
				body: { plan: UUID },
			},
			{
				name: "delete sharing",
				call: () => callDeleteSharing(UUID),
				method: "delete",
				url: `/planning/shared/${UUID}/`,
			},
			{
				name: "clone shared plan",
				call: () => callCloneSharedPlan(UUID),
				method: "post",
				url: `/planning/shared/${UUID}/clone/`,
			},
			{
				name: "create api key",
				call: () => callPostCreateAPIKey("key"),
				method: "post",
				url: "/user/api/keys/",
				body: { name: "key" },
			},
			{
				name: "delete api key",
				call: () => callDeleteAPIKey("1"),
				method: "delete",
				url: "/user/api/keys/1/",
			},
			{
				name: "login",
				call: () => callUserLogin("user", "test-password"),
				method: "post",
				url: "/user/login/",
				body: { username: "user", password: "test-password" },
			},
			{
				name: "refresh token",
				call: () => callRefreshToken(REFRESH_TOKEN),
				method: "post",
				url: "/user/refresh/",
				body: { refresh: REFRESH_TOKEN },
			},
			{
				name: "verify email",
				call: () => callVerifyEmail({ code: "123" }),
				method: "post",
				url: "/user/verify_email/",
				body: { code: "123" },
			},
			{
				name: "change password",
				call: () =>
					callChangePassword({
						old_password: "old-test",
						new_password: "new-test",
					}),
				method: "post",
				url: "/user/change_password/",
				body: { old_password: "old-test", new_password: "new-test" },
			},
			{
				name: "register",
				call: () =>
					callRegisterUser({
						username: "user",
						password: "test-password",
						planet_id: "OT-580b",
						planet_input: "OT-580b",
					}),
				method: "post",
				url: "/user/signup/",
				body: {
					username: "user",
					password: "test-password",
					planet_id: "OT-580b",
					planet_input: "OT-580b",
				},
			},
			{
				name: "request password reset",
				call: () => callRequestPasswordReset("user@example.com"),
				method: "post",
				url: "/user/request_password_reset/",
				body: { email: "user@example.com" },
			},
			{
				name: "password reset",
				call: () =>
					callPasswordReset("user@example.com", "123", "new-test"),
				method: "post",
				url: "/user/password_reset/",
				body: {
					email: "user@example.com",
					code: "123",
					new_password: "new-test",
				},
			},
		];

		it.each(cases)(
			"$name: $method $url",
			async ({ call, method, url, body }) => {
				// response parsing may reject the dummy reply, the request
				// has been sent by then
				await call().catch(() => undefined);

				expect(mock.history[method]).toHaveLength(1);
				const request = lastRequest(method);
				expect(request.url).toBe(url);
				expect(request.body).toStrictEqual(body);
			}
		);
	});

	describe("user preferences", () => {
		/*
		 * Fields of backend UserPreferenceSerializer
		 * (backend/user/api/serializer.py). A preference outside this list
		 * is dropped by the backend and resets on the next load, so it
		 * needs a backend change first.
		 */
		const BACKEND_PREFERENCE_FIELDS = [
			"locale",
			"defaultEmpireUuid",
			"defaultCXUuid",
			"defaultBuyItemsFromCX",
			"burnDaysRed",
			"burnDaysYellow",
			"burnResupplyDays",
			"burnOrigin",
			"supplyCartDays",
			"layoutNavigationStyle",
			"colorPalette",
			"planSuggestions",
			"planOverrides",
		];

		// backend GET response for a user without stored preferences
		const backendDefaults = {
			locale: "en_US",
			defaultEmpireUuid: null,
			defaultCXUuid: null,
			defaultBuyItemsFromCX: true,
			burnDaysRed: 5,
			burnDaysYellow: 10,
			burnResupplyDays: 18,
			burnOrigin: "Antares Station Warehouse",
			supplyCartDays: 20,
			layoutNavigationStyle: "full",
			colorPalette: "default",
			planSuggestions: true,
			planOverrides: {},
		};

		it("parses the backend default response", () => {
			expect(UserPreferenceSchema.parse(backendDefaults)).toStrictEqual({
				...backendDefaults,
				defaultEmpireUuid: undefined,
				defaultCXUuid: undefined,
			});
		});

		it("parses stored plan overrides", () => {
			const parsed = UserPreferenceSchema.parse({
				...backendDefaults,
				planOverrides: {
					[UUID]: {
						includeCM: true,
						visitationMaterialExclusions: ["DW"],
						autoOptimizeHabs: false,
						constructionBuilt: { FRM: 3 },
					},
				},
			});

			expect(parsed.planOverrides[UUID]).toStrictEqual({
				includeCM: true,
				visitationMaterialExclusions: ["DW"],
				autoOptimizeHabs: false,
				constructionBuilt: { FRM: 3 },
			});
		});

		it("rejects negative or fractional built counts", () => {
			for (const count of [-1, 1.5])
				expect(() =>
					UserPreferenceSchema.parse({
						...backendDefaults,
						planOverrides: {
							[UUID]: {
								autoOptimizeHabs: true,
								constructionBuilt: { FRM: count },
							},
						},
					})
				).toThrow();
		});

		it("only sends fields the backend knows", async () => {
			await callPatchUserPreferences({
				...preferenceDefaults,
				defaultEmpireUuid: UUID,
				defaultCXUuid: UUID,
			}).catch(() => undefined);

			const { url, body } = lastRequest("patch");
			expect(url).toBe("/user/preferences/");
			expect(Object.keys(body).sort()).toStrictEqual(
				[...BACKEND_PREFERENCE_FIELDS].sort()
			);
			expect(body.defaultEmpireUuid).toBe(UUID);
		});

		it("sends unset default empire / cx as null", async () => {
			// the backend merges PATCH into stored preferences, an omitted
			// key would keep the previous uuid
			await callPatchUserPreferences({
				defaultEmpireUuid: null,
				defaultCXUuid: null,
			}).catch(() => undefined);

			const { body } = lastRequest("patch");
			expect(body.defaultEmpireUuid).toBeNull();
			expect(body.defaultCXUuid).toBeNull();
		});

		it("parses null plan overrides as empty", () => {
			expect(
				UserPreferenceSchema.parse({
					...backendDefaults,
					planOverrides: null,
				}).planOverrides
			).toStrictEqual({});
		});

		it("falls back to full navigation for unknown styles", () => {
			expect(
				UserPreferenceSchema.parse({
					...backendDefaults,
					layoutNavigationStyle: "x",
				}).layoutNavigationStyle
			).toBe("full");
		});

		it("falls back to the default palette for unknown or missing values", () => {
			expect(
				UserPreferenceSchema.parse({
					...backendDefaults,
					colorPalette: "x",
				}).colorPalette
			).toBe("default");

			const { colorPalette: _, ...oldBackend } = backendDefaults;
			expect(UserPreferenceSchema.parse(oldBackend).colorPalette).toBe(
				"default"
			);
		});

		it("turns plan suggestions on when missing or invalid", () => {
			const { planSuggestions: _, ...oldBackend } = backendDefaults;
			expect(UserPreferenceSchema.parse(oldBackend).planSuggestions).toBe(
				true
			);
			expect(
				UserPreferenceSchema.parse({
					...backendDefaults,
					planSuggestions: "x",
				}).planSuggestions
			).toBe(true);
			expect(
				UserPreferenceSchema.parse({
					...backendDefaults,
					planSuggestions: false,
				}).planSuggestions
			).toBe(false);
		});
	});

	describe("planet", () => {
		it.each([
			{ description: "without production fees", production_fees: null },
			{
				description: "with production fees",
				production_fees: {
					currency: "NCC",
					fees: {
						AGRICULTURE: [1.5, 0, 0, 0, 3],
						CHEMISTRY: [0, 2.25, 0, 0, 0],
					},
				},
			},
		])("parses backend payload $description", ({ production_fees }) => {
			expect(() =>
				PlanetSchema.parse({ ...planet_single, production_fees })
			).not.toThrow();
		});
	});

	describe("storage", () => {
		it("parses a storage without StorageItems as empty", () => {
			const storage = {
				WeightCapacity: 1000,
				VolumeCapacity: 1000,
				WeightLoad: 0,
				VolumeLoad: 0,
				Identifier: "OT-580b",
			};

			const parsed = FIOStorageSchema.parse({
				storage_data: {
					planets: { "OT-580b": storage },
					warehouses: {},
					ships: {},
				},
				sites_data: {},
				last_modified: "2026-09-27T10:00:00Z",
			});

			expect(
				parsed.storage_data.planets["OT-580b"].StorageItems
			).toStrictEqual([]);
		});
	});

	describe("market exploration", () => {
		it("accepts the UNIVERSE exchange code", () => {
			expect(() =>
				ExplorationPayloadSchema.parse([
					{
						ticker: "DW",
						exchange_code: "UNIVERSE",
						date_epoch: 1790500000000,
						open_p: 1,
						close_p: 1,
						high_p: 1,
						low_p: 1,
						volume: 1,
						traded: 1,
					},
				])
			).not.toThrow();
		});
	});
});
