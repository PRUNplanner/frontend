import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useAlertsStore } from "@/stores/userAlertsStore";

describe("Alerts Store", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("adds a disabled default alert with a unique id", () => {
		const store = useAlertsStore();

		store.addAlert();
		store.addAlert();

		expect(store.userAlerts).toHaveLength(2);
		expect(store.userAlerts[0]).toMatchObject({
			name: "New Alert",
			severity: "LOW",
			enabled: false,
			logic: { operator: "AND", conditions: [] },
		});
		expect(store.userAlerts[0].id).not.toBe(store.userAlerts[1].id);
	});

	it("edits a copy and only applies it on save", () => {
		const store = useAlertsStore();
		store.addAlert();
		const alert = store.userAlerts[0];

		store.startEditing(alert);
		store.activeDraft!.name = "Renamed";

		expect(store.userAlerts[0].name).toBe("New Alert");

		store.saveEdit();

		expect(store.userAlerts[0].name).toBe("Renamed");
		expect(store.activeDraft).toBeNull();
	});

	it("discards the draft on cancel", () => {
		const store = useAlertsStore();
		store.addAlert();

		store.startEditing(store.userAlerts[0]);
		store.activeDraft!.name = "Renamed";
		store.cancelEditing();
		store.saveEdit();

		expect(store.userAlerts[0].name).toBe("New Alert");
		expect(store.activeDraft).toBeNull();
	});

	it("updates and deletes by id, ignoring unknown ids", () => {
		const store = useAlertsStore();
		store.addAlert();
		store.addAlert();
		const [first, second] = store.userAlerts;

		store.updateAlert(first.id, { ...first, enabled: true });
		store.updateAlert("unknown", { ...first, name: "Ghost" });

		expect(store.userAlerts[0].enabled).toBe(true);
		expect(store.userAlerts.map((a) => a.name)).not.toContain("Ghost");

		store.deleteAlert(first.id);
		store.deleteAlert("unknown");

		expect(store.userAlerts.map((a) => a.id)).toStrictEqual([second.id]);
	});
});
