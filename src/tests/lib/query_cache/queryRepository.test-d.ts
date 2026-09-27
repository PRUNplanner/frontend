import { describe, expectTypeOf, it } from "vitest";

import { useQuery } from "@/lib/query_cache/useQuery";
import type { QueryParams } from "@/lib/query_cache/queryRepository.types";

// Types & Interfaces
import type { Material } from "@/features/api/schemas/gameData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";

// type-level only: run by `vitest --typecheck`, checks the inferred repository
describe("query repository types", () => {
	it("infers data from fetchFn", () => {
		expectTypeOf(
			useQuery("GetPlan", { planUuid: "p" }).execute
		).returns.resolves.toEqualTypeOf<Plan>();
		expectTypeOf(
			useQuery("GetMaterials").execute
		).returns.resolves.toEqualTypeOf<Material[]>();
	});

	it("requires params exactly when a query takes them", () => {
		expectTypeOf<QueryParams<"GetMaterials">>().toEqualTypeOf<undefined>();
		expectTypeOf<QueryParams<"GetPlan">>().toEqualTypeOf<{
			planUuid: string;
		}>();

		// @ts-expect-error missing params
		useQuery("GetPlan");
		// @ts-expect-error wrong params
		useQuery("GetPlan", { uuid: "p" });
		// @ts-expect-error params on a query without any
		useQuery("GetMaterials", { planUuid: "p" });
	});
});
