import { describe, it, expect, vi } from "vitest";
import { computed, nextTick, ref } from "vue";

import { usePlanIO } from "@/features/planning/usePlanIO";
import { mountComposable } from "@/tests/mountComponent";

// Types & Interfaces
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent,
}));

const row = (ticker: string, delta: number) => ({
	ticker,
	input: delta < 0 ? -delta : 0,
	output: delta > 0 ? delta : 0,
	delta,
	individualWeight: 1,
	individualVolume: 1,
	totalWeight: delta,
	totalVolume: delta,
	price: 10 * delta,
});

const result = ref({
	materialio: [row("H2O", 2), row("RAT", -1)],
	productionMaterialIO: [row("H2O", 3)],
	workforceMaterialIO: [row("RAT", -1)],
} as unknown as IPlanResult);

describe("usePlanIO", () => {
	it("shows the picked flow and tracks the user's pick", async () => {
		const { result: io } = await mountComposable(() =>
			usePlanIO(
				computed(() => result.value),
				() => "Plan"
			)
		);
		expect(io.ioRows.value.map((r) => r.ticker)).toEqual(["H2O", "RAT"]);

		io.refIOSource.value = "production";
		await nextTick();
		expect(io.ioRows.value.map((r) => r.ticker)).toEqual(["H2O"]);
		expect(trackEvent).toHaveBeenCalledWith("plan:io_view", {
			source: "production",
			filter: "all",
			value: "price",
		});

		io.refIOSource.value = "workforce";
		expect(io.ioRows.value.map((r) => r.ticker)).toEqual(["RAT"]);
		expect(io.ioSourceOptions.value.map((o) => o.value)).toEqual([
			"all",
			"production",
			"workforce",
		]);
	});

	it("downloads the shown rows as CSV named after the plan", async () => {
		const { result: io } = await mountComposable(() =>
			usePlanIO(
				computed(() => result.value),
				() => "My Plan"
			)
		);
		URL.createObjectURL = vi.fn(() => "blob:csv");
		URL.revokeObjectURL = vi.fn();
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				expect(this.download).toBe("My Plan-material-io.csv");
				expect(this.href).toBe("blob:csv");
			});

		io.downloadMaterialIO();
		expect(click).toHaveBeenCalledTimes(1);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:csv");
		click.mockRestore();
	});
});
