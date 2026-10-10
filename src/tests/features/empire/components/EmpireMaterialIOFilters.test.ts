import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import EmpireMaterialIOFilters from "@/features/empire/components/EmpireMaterialIOFilters.vue";
import PButton from "@/ui/components/PButton.vue";
import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import { mountComponent } from "@/tests/mountComponent";

const MATERIAL_OPTIONS = [
	{ label: "RAT", value: "RAT" },
	{ label: "FE", value: "FE" },
];
const PLANET_OPTIONS = [
	{ label: "Montem", value: "OT-580b" },
	{ label: "ZV-307c", value: "ZV-307c" },
];

async function mountFilters(props: Record<string, unknown> = {}) {
	return mountComponent(EmpireMaterialIOFilters, {
		loadBalance: false,
		hideConsumables: false,
		expandAll: false,
		filterMaterials: [],
		filterPlanets: [],
		materialOptions: MATERIAL_OPTIONS,
		planetOptions: PLANET_OPTIONS,
		...props,
	});
}

const button = (wrapper: VueWrapper, label: string) => {
	const found = wrapper
		.findAllComponents(PButton)
		.find((b) => b.text() === label);
	expect(found).toBeDefined();
	return found!;
};

/** button type per label, the active option is the primary one */
const types = (wrapper: VueWrapper, ...labels: string[]) =>
	labels.map((label) => button(wrapper, label).props("type"));

async function click(wrapper: VueWrapper, label: string) {
	await button(wrapper, label).trigger("click");
	await flushPromises();
}

/** multi selects: 0 materials, 1 planets */
const selects = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PSelectMultiple);

const ALL = "empire.filters.all";
const LOADBALANCE = "empire.filters.loadbalance";
const SHOW = "common.buttons.show";
const HIDE = "common.buttons.hide";
const SUMMARY = "empire.material_io.summary";
const EXPAND_ALL = "empire.material_io.expand_all";

describe("EmpireMaterialIOFilters", () => {
	it("marks the active display option", async () => {
		const { wrapper, setProps } = await mountFilters();

		expect(types(wrapper, ALL, LOADBALANCE)).toEqual([
			"primary",
			"secondary",
		]);

		await setProps({ loadBalance: true });
		expect(types(wrapper, ALL, LOADBALANCE)).toEqual([
			"secondary",
			"primary",
		]);
	});

	it("marks the active consumables option", async () => {
		const { wrapper, setProps } = await mountFilters();

		expect(types(wrapper, SHOW, HIDE)).toEqual(["primary", "secondary"]);

		await setProps({ hideConsumables: true });
		expect(types(wrapper, SHOW, HIDE)).toEqual(["secondary", "primary"]);
	});

	it("emits the display option and re-applies the filter", async () => {
		const { wrapper, component } = await mountFilters();

		await click(wrapper, LOADBALANCE);
		await click(wrapper, ALL);

		expect(component.emitted("update:loadBalance")).toEqual([
			[true],
			[false],
		]);
		expect(component.emitted("applyFilter")).toHaveLength(2);
		expect(component.emitted("update:hideConsumables")).toBeUndefined();
		// controlled: the prop, not the click, decides the active option
		expect(types(wrapper, ALL, LOADBALANCE)).toEqual([
			"primary",
			"secondary",
		]);
	});

	it("emits the consumables option and re-applies the filter", async () => {
		const { wrapper, component } = await mountFilters();

		await click(wrapper, HIDE);
		await click(wrapper, SHOW);

		expect(component.emitted("update:hideConsumables")).toEqual([
			[true],
			[false],
		]);
		expect(component.emitted("applyFilter")).toHaveLength(2);
		expect(component.emitted("update:loadBalance")).toBeUndefined();
	});

	it("hides the planets control unless asked for", async () => {
		const { wrapper } = await mountFilters();

		expect(wrapper.text()).not.toContain("empire.material_io.planets");
		expect(wrapper.findAllComponents(PButton).map((b) => b.text())).toEqual(
			[ALL, LOADBALANCE, SHOW, HIDE]
		);
	});

	it("marks summary or expand all", async () => {
		const { wrapper, setProps } = await mountFilters({
			showExpandAll: true,
		});

		expect(wrapper.text()).toContain("empire.material_io.planets");
		expect(types(wrapper, SUMMARY, EXPAND_ALL)).toEqual([
			"primary",
			"secondary",
		]);

		await setProps({ expandAll: true });
		expect(types(wrapper, SUMMARY, EXPAND_ALL)).toEqual([
			"secondary",
			"primary",
		]);
	});

	it("expands all without re-applying the filter", async () => {
		const { wrapper, component } = await mountFilters({
			showExpandAll: true,
		});

		await click(wrapper, EXPAND_ALL);

		expect(component.emitted("update:expandAll")).toEqual([[true]]);
		expect(component.emitted("collapseAll")).toBeUndefined();
		expect(component.emitted("applyFilter")).toBeUndefined();
	});

	it("summary collapses every row, also when already selected", async () => {
		const { wrapper, component, setProps } = await mountFilters({
			showExpandAll: true,
			expandAll: true,
		});

		await click(wrapper, SUMMARY);
		await setProps({ expandAll: false });
		await click(wrapper, SUMMARY);

		expect(component.emitted("update:expandAll")).toEqual([
			[false],
			[false],
		]);
		expect(component.emitted("collapseAll")).toHaveLength(2);
		expect(component.emitted("applyFilter")).toBeUndefined();
	});

	it("passes options and selected values to the selects", async () => {
		const { wrapper, setProps } = await mountFilters({
			filterMaterials: ["FE"],
			filterPlanets: ["OT-580b"],
		});

		expect(selects(wrapper)[0].props()).toMatchObject({
			value: ["FE"],
			options: MATERIAL_OPTIONS,
		});
		expect(selects(wrapper)[1].props()).toMatchObject({
			value: ["OT-580b"],
			options: PLANET_OPTIONS,
		});

		await setProps({ filterMaterials: ["RAT", "FE"], filterPlanets: [] });
		expect(selects(wrapper)[0].props("value")).toEqual(["RAT", "FE"]);
		expect(selects(wrapper)[1].props("value")).toEqual([]);
	});

	it("emits the material filter and re-applies the filter", async () => {
		const { wrapper, component } = await mountFilters();

		selects(wrapper)[0].vm.$emit("update:value", ["RAT"]);
		await flushPromises();

		expect(component.emitted("update:filterMaterials")).toEqual([
			[["RAT"]],
		]);
		expect(component.emitted("update:filterPlanets")).toBeUndefined();
		expect(component.emitted("applyFilter")).toHaveLength(1);
	});

	it("emits the planet filter and re-applies the filter", async () => {
		const { wrapper, component } = await mountFilters({
			filterPlanets: ["ZV-307c"],
		});

		selects(wrapper)[1].vm.$emit("update:value", []);
		await flushPromises();

		expect(component.emitted("update:filterPlanets")).toEqual([[[]]]);
		expect(component.emitted("update:filterMaterials")).toBeUndefined();
		expect(component.emitted("applyFilter")).toHaveLength(1);
	});
});
