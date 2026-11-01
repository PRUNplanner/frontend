import { beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROIChartDrawer from "@/features/base_roi/components/BaseROIChartDrawer.vue";
import PScatter from "@/ui/charts/PScatter.vue";
import PLayerClose from "@/ui/components/PLayerClose.vue";
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
		const never = {
			...rows[0],
			key: "never",
			metrics: { ...rows[0].metrics, breakEven: Infinity },
		};
		const { wrapper } = await mountDrawer([...rows, never]);
		const points = wrapper
			.findComponent(PScatter)
			.props("points") as IScatterPoint[];
		const drawn = rows.filter(
			(r) =>
				Number.isFinite(r.metrics.breakEven) &&
				r.metrics.breakEven > 0 &&
				Number.isFinite(r.metrics.marketCapacity) &&
				r.metrics.marketCapacity > 0
		);
		expect(points.map((p) => p.key)).toEqual(drawn.map((r) => r.key));
		for (const p of points) {
			const row = drawn.find((r) => r.key === p.key)!;
			expect(p.x).toBe(row.metrics.breakEven);
			expect(p.y).toBe(row.metrics.marketCapacity);
			expect(p.color).toBe(
				row.kind === "recipe" ? "colour-IC1" : "colour-AI1"
			);
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
		wrapper
			.find("section")
			.element.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
			);
		await flushPromises();
		expect(shows).toEqual([false]);
	});

	it("the grip resizes with the arrow keys and the pointer", async () => {
		const { wrapper } = await mountDrawer(rows);
		const panel = wrapper.find("section");
		const height = () =>
			parseInt(panel.attributes("style")!.match(/height: (\d+)px/)![1]);
		const grip = wrapper.find('[role="separator"]');
		const before = height();
		await grip.trigger("keydown", { key: "ArrowUp" });
		expect(height()).toBeGreaterThan(before);
		await grip.trigger("keydown", { key: "ArrowDown" });
		expect(height()).toBe(before);
		for (const e of [
			"pointerdown",
			"pointermove",
			"pointerup",
			"pointercancel",
		])
			await grip.trigger(e);
	});

	it("the close button closes it", async () => {
		const { wrapper, shows } = await mountDrawer(rows);
		wrapper.findComponent(PLayerClose).vm.$emit("click");
		expect(shows).toEqual([false]);
	});

	it("marks the best trade-offs: low break-even, high market capacity", async () => {
		const row = (
			key: string,
			breakEven: number,
			marketCapacity: number
		) => ({
			...rows[0],
			key,
			metrics: { ...rows[0].metrics, breakEven, marketCapacity },
		});
		const { wrapper } = await mountDrawer([
			row("fast", 20, 5),
			row("deep", 60, 400),
			row("beaten", 90, 100),
		]);
		const scatter = wrapper.findComponent(PScatter);
		expect(scatter.props("frontier")).toEqual(["fast", "deep"]);
		expect(scatter.props("log")).toBe(true);
		expect(
			(scatter.props("points") as IScatterPoint[])
				.filter((p) => p.emphasis)
				.map((p) => p.key)
		).toEqual(["fast", "deep"]);
	});

	it("a log axis has no 0: rows without market capacity are counted", async () => {
		const noMarket = {
			...rows[0],
			key: "no-market",
			metrics: { ...rows[0].metrics, marketCapacity: 0 },
		};
		const unlimited = {
			...rows[0],
			key: "unlimited",
			metrics: { ...rows[0].metrics, marketCapacity: Infinity },
		};
		const { wrapper } = await mountDrawer([rows[0], noMarket, unlimited]);
		const points = wrapper
			.findComponent(PScatter)
			.props("points") as IScatterPoint[];
		expect(points.map((p) => p.key)).toEqual([rows[0].key]);
		expect(wrapper.text()).toContain("base_roi.chart.no_market");
	});

	it("farming rows get their own colour; no drawable row says so", async () => {
		const farming = { ...rows[0], key: "farm", kind: "farming" as const };
		const { wrapper } = await mountDrawer([farming]);
		const [point] = wrapper
			.findComponent(PScatter)
			.props("points") as IScatterPoint[];
		expect(point.color).toBe("lime");
		// one dot: the middle size
		expect(point.size).toBe(0.5);

		const empty = await mountDrawer([]);
		expect(empty.wrapper.text()).toContain("base_roi.chart.empty");
	});

	it("the tooltip names the row with its numbers", async () => {
		const { wrapper } = await mountDrawer(rows);
		const scatter = wrapper.findComponent(PScatter);
		const [point] = scatter.props("points") as IScatterPoint[];
		const slot = (scatter.vm.$slots as { tooltip: (p: unknown) => unknown })
			.tooltip;
		const html = JSON.stringify(slot({ point }), (_k, v) =>
			typeof v === "object" && v && "children" in v
				? { c: v.children }
				: v
		);
		expect(html).toContain(point.label);
		expect(html).toContain("base_roi.chart.tooltip_profit");
	});
});
