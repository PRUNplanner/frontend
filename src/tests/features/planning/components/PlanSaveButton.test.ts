import { describe, it, expect } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import PlanSaveButton from "@/features/planning/components/PlanSaveButton.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

const savedAt = new Date(2026, 8, 29, 14, 2);

async function mountButton(props: Record<string, unknown> = {}) {
	return mountComponent(PlanSaveButton, {
		existing: true,
		saveable: true,
		saving: false,
		failed: false,
		modified: false,
		savedAt,
		...props,
	});
}

const button = (wrapper: VueWrapper) => wrapper.findComponent(PButton);
const status = (wrapper: VueWrapper) => wrapper.find("[role=status]").text();
const hasDot = (wrapper: VueWrapper) =>
	wrapper.find("span[aria-hidden=true].rounded-full").exists();

describe("PlanSaveButton", () => {
	it("reads Saved, quietly, when there is nothing to save", async () => {
		const { wrapper } = await mountButton();

		expect(button(wrapper).text()).toBe("plan.save_status.saved");
		expect(button(wrapper).props("type")).toBe("secondary");
		expect(hasDot(wrapper)).toBe(false);
		expect(status(wrapper)).toBe("plan.save_status.saved_at");
	});

	it("reads Save with a dot on unsaved changes", async () => {
		const { wrapper } = await mountButton({ modified: true });

		expect(button(wrapper).text()).toBe("common.buttons.save");
		expect(button(wrapper).props("type")).toBe("primary");
		expect(hasDot(wrapper)).toBe(true);
		expect(status(wrapper)).toBe("plan.save_status.unsaved");
	});

	it("reads Create with a dot for a named new plan", async () => {
		const { wrapper } = await mountButton({
			existing: false,
			modified: true,
		});

		expect(button(wrapper).text()).toBe("common.buttons.create");
		expect(hasDot(wrapper)).toBe(true);
	});

	it("shows saving", async () => {
		const { wrapper } = await mountButton({ modified: true, saving: true });

		expect(button(wrapper).props("loading")).toBe(true);
		expect(button(wrapper).text()).toBe("plan.save_status.saving");
		expect(status(wrapper)).toBe("plan.save_status.saving");
	});

	it("offers a retry after a failed save", async () => {
		const { wrapper, component } = await mountButton({
			modified: true,
			failed: true,
		});

		expect(button(wrapper).text()).toBe("plan.save_status.retry");
		expect(button(wrapper).props("type")).toBe("error");
		expect(status(wrapper)).toBe("plan.save_status.failed");

		await wrapper.find("button").trigger("click");
		expect(component.emitted("save")).toHaveLength(1);
	});

	it("waits for a name before creating or saving", async () => {
		const created = await mountButton({ existing: false, saveable: false });
		expect(button(created.wrapper).text()).toBe("common.buttons.create");
		expect(button(created.wrapper).props("disabled")).toBe(true);
		expect(status(created.wrapper)).toBe("plan.save_status.name_to_create");

		const existing = await mountButton({ saveable: false, modified: true });
		expect(button(existing.wrapper).props("disabled")).toBe(true);
		expect(status(existing.wrapper)).toBe("plan.save_status.name_to_save");
	});
});
