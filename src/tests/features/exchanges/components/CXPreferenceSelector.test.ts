import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia, type Pinia } from "pinia";

import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";
import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import cxList from "@/tests/test_data/api_data_cx_list.json";

const [REAL, SHARE, NORWICK] = cxList;
const NONE = { label: "None - Universe 30D", value: undefined };

async function mountSelector(
	props: Record<string, unknown> = {},
	options: { defaultCX?: string; cxs?: typeof cxList } = {}
) {
	const pinia: Pinia = createPinia();
	// @ts-expect-error fixture strings for the typed unions
	usePlanningStore(pinia).setCXs(options.cxs ?? cxList.slice(0, 3));
	const userStore = useUserStore(pinia);
	if (options.defaultCX)
		userStore.setPreference("defaultCXUuid", options.defaultCX);

	const mounted = await mountComponent(CXPreferenceSelector, props, {
		pinia,
	});
	return { ...mounted, userStore };
}

const select = (wrapper: VueWrapper) => wrapper.findComponent(PSelect);

async function pick(wrapper: VueWrapper, value: string | null) {
	select(wrapper).vm.$emit("update:value", value);
	await flushPromises();
}

describe("CXPreferenceSelector", () => {
	it("offers no CX and every CX of the user", async () => {
		const { wrapper } = await mountSelector();

		expect(select(wrapper).props("options")).toEqual([
			NONE,
			{ label: "PRUN CX REAL", value: REAL.uuid },
			{ label: "Share CX", value: SHARE.uuid },
			{ label: "CX Norwick Scheme", value: NORWICK.uuid },
		]);
		expect(select(wrapper).props("searchable")).toBe(true);
		expect(select(wrapper).props("clearable")).toBe(true);
	});

	it("leaves out the no CX option when asked", async () => {
		const { wrapper } = await mountSelector({ addUndefinedCX: false });

		expect(select(wrapper).props("options")).toEqual([
			{ label: "PRUN CX REAL", value: REAL.uuid },
			{ label: "Share CX", value: SHARE.uuid },
			{ label: "CX Norwick Scheme", value: NORWICK.uuid },
		]);
	});

	it("offers only no CX without any CX", async () => {
		const { wrapper } = await mountSelector({}, { cxs: [] });

		expect(select(wrapper).props("options")).toEqual([NONE]);
		// nothing selected matches the no CX option
		expect(select(wrapper).props("value")).toBeUndefined();
		expect(wrapper.text()).toBe("None - Universe 30D");
	});

	it("shows the given CX without a default CX", async () => {
		const { wrapper, setProps } = await mountSelector({
			cxUuid: SHARE.uuid,
		});

		expect(select(wrapper).props("value")).toBe(SHARE.uuid);
		expect(wrapper.text()).toBe("Share CX");

		await setProps({ cxUuid: NORWICK.uuid });
		expect(wrapper.text()).toBe("CX Norwick Scheme");
	});

	it("shows the default CX over the given one", async () => {
		const { wrapper } = await mountSelector(
			{ cxUuid: SHARE.uuid },
			{ defaultCX: REAL.uuid }
		);

		expect(select(wrapper).props("value")).toBe(REAL.uuid);
		expect(wrapper.text()).toBe("PRUN CX REAL");
	});

	it("hands the shown default CX to the parent", async () => {
		// the tool views get the user's first CX from the loader
		const { component, setProps } = await mountSelector(
			{ cxUuid: SHARE.uuid },
			{ defaultCX: REAL.uuid }
		);

		expect(component.emitted("update:cxuuid")).toEqual([[REAL.uuid]]);

		// once the parent passes it back, nothing more is emitted
		await setProps({ cxUuid: REAL.uuid });
		expect(component.emitted("update:cxuuid")).toHaveLength(1);
	});

	it("emits nothing when the given CX is the default CX", async () => {
		const { component } = await mountSelector(
			{ cxUuid: REAL.uuid },
			{ defaultCX: REAL.uuid }
		);

		expect(component.emitted("update:cxuuid")).toBeUndefined();
	});

	it("ignores a default CX that no longer exists", async () => {
		const { wrapper, component } = await mountSelector(
			{ cxUuid: SHARE.uuid },
			{ defaultCX: "00000009-0000-4000-8000-000000000000" }
		);

		expect(select(wrapper).props("value")).toBe(SHARE.uuid);
		expect(wrapper.text()).toBe("Share CX");
		expect(component.emitted("update:cxuuid")).toBeUndefined();
	});

	it("emits the picked CX and stores it as default", async () => {
		const { wrapper, component, userStore } = await mountSelector({
			cxUuid: SHARE.uuid,
		});

		await pick(wrapper, NORWICK.uuid);

		expect(component.emitted("update:cxuuid")).toEqual([[NORWICK.uuid]]);
		expect(userStore.preferences.defaultCXUuid).toBe(NORWICK.uuid);
		// the parent has not passed it back yet, the default shows
		expect(wrapper.text()).toBe("CX Norwick Scheme");
	});

	it("falls back to the given CX when cleared", async () => {
		const { wrapper, component, userStore } = await mountSelector(
			{ cxUuid: SHARE.uuid },
			{ defaultCX: REAL.uuid }
		);

		// PSelect clears to null
		await pick(wrapper, null);

		// the default on mount, then the cleared value
		expect(component.emitted("update:cxuuid")).toEqual([
			[REAL.uuid],
			[null],
		]);
		expect(userStore.preferences.defaultCXUuid).toBeNull();
		expect(wrapper.text()).toBe("Share CX");
	});

	it("styles the select", async () => {
		const { wrapper } = await mountSelector({ selectClass: "w-50" });

		expect(select(wrapper).classes()).toContain("w-50");
	});
});
