import { beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import AlertManager from "@/features/market_live/components/AlertManager.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useAlertsStore } from "@/stores/userAlertsStore";

// Types & Interfaces
import type {
	DetectorConfig,
	RuleGroup,
} from "@/features/market_live/cxDetectors.types";

// the rule editor has its own test: shows its group, reports a replaced one
const NEW_GROUP: RuleGroup = { operator: "OR", conditions: [] };
vi.mock("@/features/market_live/components/RuleGroup.vue", () => ({
	default: {
		name: "RuleGroup",
		props: ["group"],
		emits: ["update:group"],
		render: (ctx: { group: RuleGroup }) =>
			h("span", { "data-testid": "group" }, ctx.group.operator),
	},
}));

const alertConfig = (
	id: string,
	extra: Partial<DetectorConfig> = {}
): DetectorConfig => ({
	id,
	name: `Alert ${id}`,
	severity: "LOW",
	logic: { operator: "AND", conditions: [] },
	enabled: false,
	...extra,
});

let pinia: Pinia;

beforeEach(() => {
	pinia = createPinia();
	setActivePinia(pinia);
});

async function mountManager(alerts: DetectorConfig[] = []) {
	const store = useAlertsStore();
	store.userAlerts = alerts;
	const { wrapper } = await mountComponent(AlertManager, {}, { pinia });
	return { wrapper, store };
}

const button = (wrapper: VueWrapper, key: string) =>
	wrapper
		.findAll("button")
		.find((b) =>
			b
				.text()
				.includes(`market_live.components.alert_manager.buttons.${key}`)
		)!;

const rowNames = (wrapper: VueWrapper) =>
	wrapper.findAll("h3").map((h3) => h3.text());

describe("AlertManager list", () => {
	it("says there are no alerts and offers to create one", async () => {
		const { wrapper } = await mountManager();

		expect(wrapper.text()).toContain(
			"market_live.components.alert_manager.no_alerts"
		);
		expect(wrapper.find("h2").text()).toBe(
			"market_live.components.alert_manager.title"
		);
		expect(button(wrapper, "create_alert")).toBeDefined();
	});

	it("lists the alerts with their status", async () => {
		const { wrapper } = await mountManager([
			alertConfig("a", { enabled: true }),
			alertConfig("b"),
		]);

		expect(rowNames(wrapper)).toEqual(["Alert a", "Alert b"]);
		expect(wrapper.text()).not.toContain(
			"market_live.components.alert_manager.no_alerts"
		);
		const rows = wrapper.findAll(".group");
		expect(rows[0].text()).toContain("market_live.status_type.active");
		expect(rows[1].text()).toContain("market_live.status_type.paused");
	});

	it("creates a new alert", async () => {
		const { wrapper, store } = await mountManager();

		await button(wrapper, "create_alert").trigger("click");

		expect(store.userAlerts).toHaveLength(1);
		expect(rowNames(wrapper)).toEqual(["New Alert"]);
	});

	it("deletes the alert of the row", async () => {
		const { wrapper, store } = await mountManager([
			alertConfig("a"),
			alertConfig("b"),
		]);

		await button(wrapper, "delete").trigger("click");

		expect(store.userAlerts.map((a) => a.id)).toEqual(["b"]);
		expect(rowNames(wrapper)).toEqual(["Alert b"]);
	});
});

describe("AlertManager editing", () => {
	async function editFirst(alerts = [alertConfig("a", { enabled: true })]) {
		const mounted = await mountManager(alerts);
		await button(mounted.wrapper, "edit").trigger("click");
		return mounted;
	}

	it("switches to the form with the alert's values", async () => {
		const { wrapper, store } = await editFirst();

		expect(store.activeDraft?.id).toBe("a");
		expect(wrapper.find("h2").text()).toBe(
			"market_live.components.alert_manager.title_editing"
		);
		expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
			"Alert a"
		);
		expect(wrapper.find("[role=combobox]").text()).toContain(
			"market_live.severity_type.LOW"
		);
		expect(wrapper.find("[data-testid=group]").text()).toBe("AND");
		// the list and its create button are gone
		expect(wrapper.findAll("h3")).toHaveLength(0);
		expect(button(wrapper, "create_alert")).toBeUndefined();
	});

	it("keeps the list unchanged until saved", async () => {
		const { wrapper, store } = await editFirst();

		await wrapper.find("input").setValue("Renamed");

		expect(store.activeDraft?.name).toBe("Renamed");
		expect(store.userAlerts[0].name).toBe("Alert a");
	});

	it("saves the edits to the list", async () => {
		const { wrapper, store } = await editFirst();

		await wrapper.find("input").setValue("Renamed");
		await button(wrapper, "save").trigger("click");

		expect(store.activeDraft).toBeNull();
		expect(rowNames(wrapper)).toEqual(["Renamed"]);
		expect(store.userAlerts[0].name).toBe("Renamed");
	});

	it("discards the edits", async () => {
		const { wrapper, store } = await editFirst();

		await wrapper.find("input").setValue("Renamed");
		await button(wrapper, "discard").trigger("click");

		expect(store.activeDraft).toBeNull();
		expect(rowNames(wrapper)).toEqual(["Alert a"]);
	});

	it("changes the severity", async () => {
		const { wrapper, store } = await editFirst();

		await wrapper
			.find("[role=combobox]")
			.trigger("keydown", { key: "Enter" });
		await flushPromises();
		const options = Array.from(
			document.body.querySelectorAll<HTMLElement>("[role=option]")
		);
		expect(options.map((o) => o.textContent?.trim())).toEqual([
			"market_live.severity_type.LOW",
			"market_live.severity_type.MEDIUM",
			"market_live.severity_type.HIGH",
		]);
		options[2].click();
		await flushPromises();

		expect(store.activeDraft?.severity).toBe("HIGH");
		expect(wrapper.find("[role=combobox]").text()).toContain(
			"market_live.severity_type.HIGH"
		);
	});

	it("toggles the status of the draft", async () => {
		const { wrapper, store } = await editFirst();
		const toggle = () => wrapper.find("button[aria-pressed]");

		expect(toggle().attributes("aria-pressed")).toBe("true");
		expect(toggle().text()).toBe("market_live.status_type.active");

		await toggle().trigger("click");

		expect(store.activeDraft?.enabled).toBe(false);
		expect(toggle().attributes("aria-pressed")).toBe("false");
		expect(toggle().text()).toBe("market_live.status_type.paused");

		await toggle().trigger("click");

		expect(store.activeDraft?.enabled).toBe(true);
	});

	it("replaces the logic with the group of the rule editor", async () => {
		const { wrapper, store } = await editFirst();

		wrapper
			.findComponent({ name: "RuleGroup" })
			.vm.$emit("update:group", NEW_GROUP);
		await wrapper.vm.$nextTick();

		expect(store.activeDraft?.logic).toEqual(NEW_GROUP);
		expect(wrapper.find("[data-testid=group]").text()).toBe("OR");
		expect(store.userAlerts[0].logic.operator).toBe("AND");
	});
});
