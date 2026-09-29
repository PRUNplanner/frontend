import { describe, it, expect } from "vitest";

import PlanSaveStatus from "@/features/planning/components/PlanSaveStatus.vue";
import { mountComponent } from "@/tests/mountComponent";

const savedAt = new Date(2026, 8, 29, 14, 2);

async function mountStatus(props: Record<string, unknown> = {}) {
	return mountComponent(PlanSaveStatus, {
		existing: true,
		saveable: true,
		saving: false,
		failed: false,
		modified: false,
		savedAt,
		...props,
	});
}

describe("PlanSaveStatus", () => {
	it("shows when it was saved", async () => {
		const { wrapper } = await mountStatus();

		expect(wrapper.attributes("role")).toBe("status");
		expect(wrapper.text()).toBe("plan.save_status.saved_at");
		expect(wrapper.find("button").exists()).toBe(false);
	});

	it("shows unsaved changes", async () => {
		const { wrapper } = await mountStatus({ modified: true });

		expect(wrapper.text()).toBe("plan.save_status.unsaved");
	});

	it("shows saving over unsaved changes", async () => {
		const { wrapper } = await mountStatus({ modified: true, saving: true });

		expect(wrapper.text()).toBe("plan.save_status.saving");
	});

	it("offers a retry after a failed save", async () => {
		const { wrapper, component } = await mountStatus({
			modified: true,
			failed: true,
		});

		expect(wrapper.text()).toContain("plan.save_status.failed");
		await wrapper.find("button").trigger("click");
		expect(component.emitted("retry")).toHaveLength(1);
	});

	it("asks for a name before creating or saving", async () => {
		const created = await mountStatus({ existing: false, saveable: false });
		expect(created.wrapper.text()).toBe("plan.save_status.name_to_create");

		const existing = await mountStatus({ saveable: false, failed: true });
		expect(existing.wrapper.text()).toBe("plan.save_status.name_to_save");
		expect(existing.wrapper.find("button").exists()).toBe(false);
	});
});
