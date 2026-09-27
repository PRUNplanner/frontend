import { describe, expectTypeOf, it } from "vitest";

import { useQuery } from "@/lib/query_cache/useQuery";
import { QueryParams } from "@/lib/query_cache/queryRepository.types";

// Types & Interfaces
import { IMaterial } from "@/features/api/gameData.types";
import { IPlan } from "@/stores/planningStore.types";

// type-level only: run by `vitest --typecheck`, checks the inferred repository
describe("query repository types", () => {
	it("infers data from fetchFn", () => {
		expectTypeOf(
			useQuery("GetPlan", { planUuid: "p" }).execute
		).returns.resolves.toEqualTypeOf<IPlan>();
		expectTypeOf(
			useQuery("GetMaterials").execute
		).returns.resolves.toEqualTypeOf<IMaterial[]>();
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
