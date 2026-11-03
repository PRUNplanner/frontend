import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { nextTick } from "vue";

import { useAlertsStore } from "@/stores/userAlertsStore";
import { useUserStore } from "@/stores/userStore";
import { jwt } from "@/tests/jwt";

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

	describe("per user storage", () => {
		const KEY = "prunplanner_alerts";

		beforeEach(() => localStorage.clear());

		// a login as another user replaces the refresh token
		const loginAs = async (userId: number | undefined) => {
			useUserStore().refreshToken =
				userId === undefined ? undefined : jwt(userId);
			await nextTick();
		};

		it("hides one user's alerts from the next, and shows them again", async () => {
			const store = useAlertsStore();
			await loginAs(1);
			store.addAlert();
			store.userAlerts[0].name = "A's alert";
			await nextTick();
			expect(JSON.parse(localStorage.getItem(`${KEY}:1`)!)).toMatchObject(
				{
					userAlerts: [{ name: "A's alert" }],
				}
			);

			await loginAs(undefined);
			expect(store.userAlerts).toStrictEqual([]);

			await loginAs(2);
			expect(store.userAlerts).toStrictEqual([]);
			store.addAlert();
			await nextTick();

			await loginAs(1);
			expect(store.userAlerts.map((a) => a.name)).toStrictEqual([
				"A's alert",
			]);
			expect(
				JSON.parse(localStorage.getItem(`${KEY}:2`)!).userAlerts
			).toHaveLength(1);
		});

		it("moves the alerts stored before keys were per user to the first user", async () => {
			localStorage.setItem(
				KEY,
				JSON.stringify({ userAlerts: [{ id: "x", name: "Old" }] })
			);
			const store = useAlertsStore();
			await loginAs(3);

			expect(store.userAlerts.map((a) => a.name)).toStrictEqual(["Old"]);
			expect(localStorage.getItem(KEY)).toBeNull();

			await loginAs(4);
			expect(store.userAlerts).toStrictEqual([]);
		});

		it("drops a draft of the previous user and reads corrupt data as none", async () => {
			localStorage.setItem(`${KEY}:5`, "{not json");
			const store = useAlertsStore();
			await loginAs(6);
			store.addAlert();
			store.startEditing(store.userAlerts[0]);

			await loginAs(5);
			expect(store.userAlerts).toStrictEqual([]);
			expect(store.activeDraft).toBeNull();
		});
	});
});
