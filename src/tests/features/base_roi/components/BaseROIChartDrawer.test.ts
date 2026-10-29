import { beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROIChartDrawer from "@/features/base_roi/components/BaseROIChartDrawer.vue";
import PScatter from "@/ui/charts/PScatter.vue";
import { mountComponent } from "@/tests/mountComponent";
import { baseROIRows } from "@/tests/features/base_roi/baseROI.fixtures";

// Types & Interfaces
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";
import type { IScatterPoint } from "@/ui/charts/scatter.types";

vi.mock("@/ui/charts/chartTheme", async () => {
	const { computed } = await import("vue");
	return {
		useChartTheme: () =>
			computed(() => ({
				ink: "white",
				muted: "grey",
				grid: "grey",
				axis: "grey",
				positive: "lime",
				negative: "red",
				exchange: (code: string) => `colour-${code}`,
			})),
	};
});

let rows: IBaseROIRow[];
beforeAll(async () => {
	rows = await baseROIRows();
});

async function mountDrawer(list: IBaseROIRow[]) {
	const shows: boolean[] = [];
	const actives: (string | null)[] = [];
	const { wrapper } = await mountComponent(
		BaseROIChartDrawer,
		{
			rows: list,
			show: true,
			"onUpdate:show": (v: boolean) => shows.push(v),
			"onUpdate:active": (v: string | null) => actives.push(v),
		},
		{ attach: true }
	);
	await flushPromises();
	return { wrapper, shows, actives };
}

describe("BaseROIChartDrawer (criterion 23)", () => {
	it("one dot per row with a positive break-even, sized by profit, coloured by kind", async () => {
		const never = { ...rows[0], key: "never", metrics: { ...rows[0].metrics, breakEven: Infinity } };
		const { wrapper } = await mountDrawer([...rows, never]);
		const points = wrapper.findComponent(PScatter).props("points") as IScatterPoint[];
		const drawn = rows.filter((r) => Number.isFinite(r.metrics.breakEven) && r.metrics.breakEven > 0);
		expect(points.map((p) => p.key)).toEqual(drawn.map((r) => r.key));
		for (const p of points) {
			const row = drawn.find((r) => r.key === p.key)!;
			expect(p.x).toBe(row.metrics.marketCapacity);
			expect(p.y).toBe(row.metrics.breakEven);
			expect(p.color).toBe(row.kind === "recipe" ? "colour-IC1" : "colour-AI1");
		}
		const sizes = points.map((p) => p.size!);
		expect(Math.max(...sizes)).toBe(1);
		expect(Math.min(...sizes)).toBe(0);
		expect(wrapper.text()).toContain("base_roi.chart.never");
	});

	it("a hovered dot is the active row", async () => {
		const { wrapper, actives } = await mountDrawer(rows);
		wrapper.findComponent(PScatter).vm.$emit("update:active", rows[0].key);
		expect(actives).toEqual([rows[0].key]);
	});

	it("Esc closes it", async () => {
		const { wrapper, shows } = await mountDrawer(rows);
		wrapper.find("section").element.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		);
		await flushPromises();
		expect(shows).toEqual([false]);
	});
});
