import { describe, it, expect, beforeAll, vi } from "vitest";
import { h } from "vue";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import MaterialDataChart from "@/features/market_exploration/components/MaterialDataChart.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

// chart.js has no canvas in jsdom
vi.mock(
	"@/features/market_exploration/components/MaterialDataChart.vue",
	() => ({
		default: {
			name: "MaterialDataChart",
			props: { materialTicker: String, displayValue: String },
			render: () => h("div"),
		},
	})
);

const RED = "rgb(255, 0, 0)";
const ORANGE = "rgb(255, 165, 0)";
// the component writes rgb(255, 299, 71), CSS clamps it like browsers do
const YELLOW = "rgb(255, 255, 71)";
const GREEN = "rgb(60, 179, 113)";

const gradient = (empty: string, color: string) =>
	`background: linear-gradient(transparent ${empty}%, ${color} 0%);`;

async function mountTile(props: Record<string, unknown> = {}) {
	const mounted = await mountComponent(MaterialTile, {
		key: "tile",
		ticker: "FE",
		...props,
	});
	// material and exchange overview (the popover) load in onMounted
	await vi.waitFor(() => {
		expect(mounted.wrapper.find(".material-category-metals").exists()).toBe(
			true
		);
		if (props.enablePopover !== false)
			expect(inPopover(mounted.wrapper)).toBe(true);
	});
	return mounted;
}

/** ticker rendered as the exchange popover trigger */
const inPopover = (wrapper: VueWrapper) =>
	!!wrapper.find(".font-bold").element.closest(".ptooltip");

const tile = (wrapper: VueWrapper) => wrapper.find(".material-tile");
const indicator = (wrapper: VueWrapper) =>
	wrapper.find(".material-tile div[style]");
const body = () => new DOMWrapper(document.body);
const drawer = () => body().find(".n-drawer");

describe("MaterialTile", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("shows the ticker in its category colour", async () => {
		const { wrapper } = await mountTile();

		expect(tile(wrapper).text()).toBe("FE");
		expect(tile(wrapper).classes()).toContain("material-category-metals");
	});

	it("prefixes the amount", async () => {
		const { wrapper, setProps } = await mountTile({ amount: 1234.5 });

		expect(tile(wrapper).text()).toBe("1,234.50x FE");

		// whole amounts drop the decimals
		await setProps({ amount: 10 });
		expect(tile(wrapper).text()).toBe("10x FE");
	});

	it("fills the indicator with the share of max", async () => {
		const { wrapper, setProps } = await mountTile({ amount: 10, max: 100 });

		// 10 of 100 -> 90 % stays empty
		expect(indicator(wrapper).attributes("style")).toBe(
			gradient("90.0000", RED)
		);

		// 1 of 3 -> 100 - 33.3333 = 66.6667
		await setProps({ amount: 1, max: 3 });
		expect(indicator(wrapper).attributes("style")).toBe(
			gradient("66.6667", ORANGE)
		);
	});

	it.each([
		// amount of 100: empty share -> colour
		[24, "76.0000", RED],
		[25, "75.0000", ORANGE],
		[49, "51.0000", ORANGE],
		[50, "50.0000", YELLOW],
		[74, "26.0000", YELLOW],
		[75, "25.0000", GREEN],
		[100, "0.0000", GREEN],
		// over max overflows to a negative empty share
		[150, "-50.0000", GREEN],
	])("colours %s of 100 by the empty share", async (amount, empty, color) => {
		const { wrapper } = await mountTile({ amount, max: 100 });

		expect(indicator(wrapper).attributes("style")).toBe(
			gradient(empty, color)
		);
	});

	it("shows an empty indicator without amount", async () => {
		const { wrapper } = await mountTile({ max: 100 });

		expect(indicator(wrapper).attributes("style")).toBe(
			gradient("100.0000", RED)
		);
	});

	it("has no indicator without max", async () => {
		const { wrapper } = await mountTile({ amount: 10 });

		expect(indicator(wrapper).exists()).toBe(false);
	});

	it("keeps the drawer closed by default", async () => {
		const { wrapper } = await mountTile();

		expect(tile(wrapper).classes()).toContain("hover:cursor-help");
		await tile(wrapper).trigger("click");
		await flushPromises();

		expect(drawer().exists()).toBe(false);
	});

	it("shows ticker and amount without popover", async () => {
		const { wrapper } = await mountTile({
			enablePopover: false,
			amount: 10,
		});
		await flushPromises();

		expect(inPopover(wrapper)).toBe(false);
		expect(tile(wrapper).text()).toBe("10x FE");
		expect(tile(wrapper).classes()).not.toContain("hover:cursor-help");
		expect(tile(wrapper).classes()).not.toContain("hover:cursor-pointer");
	});

	it("toggles the material drawer when enabled", async () => {
		const { wrapper } = await mountTile({ disableDrawer: false });
		expect(tile(wrapper).classes()).toContain("hover:cursor-pointer");

		await tile(wrapper).trigger("click");
		await flushPromises();

		const text = drawer().text();
		expect(text).toContain("material_tile.information.title");
		expect(text).toContain("game.material_category.metals");
		// FE weighs 7.874 t and takes 1 m³
		expect(text).toContain("7.8740 t");
		expect(text).toContain("1.0000 m³");
		expect(wrapper.findComponent(MaterialDataChart).props()).toEqual({
			materialTicker: "FE",
			displayValue: "traded",
		});

		await tile(wrapper).trigger("click");
		await flushPromises();
		expect(drawer().exists()).toBe(false);
	});

	it("switches the drawer chart value", async () => {
		const { wrapper } = await mountTile({ disableDrawer: false });
		await tile(wrapper).trigger("click");
		await flushPromises();

		const select = wrapper.findComponent(PSelect);
		expect(
			(select.props("options") as { value: string }[]).map((o) => o.value)
		).toEqual(["traded", "low_p", "high_p"]);

		select.vm.$emit("update:value", "high_p");
		await flushPromises();

		expect(
			wrapper.findComponent(MaterialDataChart).props("displayValue")
		).toBe("high_p");
	});

	it("still shows the ticker of an unknown material", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountComponent(MaterialTile, {
			key: "tile",
			ticker: "NOPE",
			disableDrawer: false,
		});
		await vi.waitFor(() => expect(error).toHaveBeenCalled());

		expect(tile(wrapper).text()).toBe("NOPE");
		// without material data the drawer stays closed
		await tile(wrapper).trigger("click");
		await flushPromises();
		expect(drawer().exists()).toBe(false);
		error.mockRestore();
	});

	it("warns when used without a key", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		await mountComponent(MaterialTile, { ticker: "FE" });
		expect(warn).toHaveBeenCalledWith(
			"[MaterialTile] should always be used with a :key!"
		);

		warn.mockClear();
		await mountTile();
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});
