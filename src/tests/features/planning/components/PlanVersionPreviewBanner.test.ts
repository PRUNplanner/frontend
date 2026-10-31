import { describe, it, expect, vi } from "vitest";

import PlanVersionPreviewBanner from "@/features/planning/components/PlanVersionPreviewBanner.vue";
import { mountComponent } from "@/tests/mountComponent";
import plan from "@/locales/en_US/plan.json";

// Types & Interfaces
import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";
import save_conflict from "@/locales/en_US/save_conflict.json";

const version = {
	uuid: "v-1",
	kind: "save",
	name: "Early stage",
	created_at: "2026-10-12T18:20:00.000000Z",
	source_version: null,
	is_active: false,
	data_bytes: 10,
};

async function mountBanner(compare: () => IChangeLine[] = vi.fn(() => [])) {
	const mounted = await mountComponent(
		PlanVersionPreviewBanner,
		{ version, compare },
		{ messages: { plan, save_conflict } }
	);
	const button = (label: string) =>
		mounted.wrapper.findAll("button").find((b) => b.text() === label)!;
	return { ...mounted, button, compare };
}

describe("PlanVersionPreviewBanner", () => {
	it("says which version is shown read-only", async () => {
		const { wrapper } = await mountBanner();
		expect(wrapper.text()).toMatch(
			/Viewing “Early stage” · .+ · read-only\. Nothing changes until you restore it\./
		);
	});

	it("compares on request and hides it again", async () => {
		const compare = vi.fn(() => [
			{ area: "corphq", key: "corphq_on", params: {} },
		]);
		const { wrapper, button } = await mountBanner(compare);
		expect(wrapper.find("[data-version-compare]").exists()).toBe(false);

		await button("Compare with current").trigger("click");
		expect(compare).toHaveBeenCalledTimes(1);
		expect(wrapper.find("[data-version-compare]").text()).toContain(
			"Corp HQ on"
		);

		await button("Hide comparison").trigger("click");
		expect(wrapper.find("[data-version-compare]").exists()).toBe(false);
	});

	it("says when the version equals the current plan", async () => {
		const { wrapper, button } = await mountBanner();
		await button("Compare with current").trigger("click");
		expect(wrapper.text()).toContain("Same as your current plan.");
	});

	it.each([
		["Restore", "restore"],
		["Open as new plan", "open-as-plan"],
		["Back to current", "back"],
	])("%s emits %s", async (label, event) => {
		const { component, button } = await mountBanner();
		await button(label).trigger("click");
		expect(component.emitted(event)).toHaveLength(1);
	});
});
