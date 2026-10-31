import { describe, it, expect, beforeEach, vi } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import axe from "axe-core";

import PlanSaveControl from "@/features/planning/components/PlanSaveControl.vue";
import PlanVersionsPopover from "@/features/planning/components/PlanVersionsPopover.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";
import plan from "@/locales/en_US/plan.json";
import common from "@/locales/en_US/common.json";

// Types & Interfaces
import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent,
}));

const NOW = new Date();
const at = (minutesAgo: number) =>
	new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
const version = (
	uuid: string,
	name: string,
	extra: Partial<PlanVersionListItem> = {}
): PlanVersionListItem => ({
	uuid,
	kind: "save",
	name,
	created_at: at(10),
	source_version: null,
	is_active: false,
	data_bytes: 10,
	...extra,
});
const versions = [
	version("v-3", "Late stage", { is_active: true }),
	version("v-2", ""),
	version("v-1", "", { kind: "baseline" }),
	version("v-0", "Restored one", {
		kind: "restore",
		source_version: "v-2",
	}),
];

const base = {
	readOnly: false,
	own: true,
	existing: true,
	saveable: true,
	saving: false,
	failed: false,
	modified: false,
	canUndo: true,
	canRedo: false,
	savedAt: NOW,
	versions,
	versioned: true,
	draftSavedAt: null,
	draftResumed: false,
	draftFailed: false,
	restoredFrom: null,
	preview: null,
};

async function mountControl(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanSaveControl,
		{ ...base, ...props },
		{ messages: { plan, common }, attach: true }
	);
}

const body = () => new DOMWrapper(document.body);
const status = (w: { find: (s: string) => DOMWrapper<Element> }) =>
	w.find("[data-save-status]");

describe("PlanSaveControl", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = "";
	});

	it("shows a saved plan's active version, without Save", async () => {
		const { wrapper } = await mountControl();
		expect(status(wrapper).text()).toMatch(/^Saved .+ · Late stage$/);
		expect(wrapper.find("[data-save]").exists()).toBe(false);
		// the menu stays: save as copy, name the current state
		expect(wrapper.find("[data-save-menu]").exists()).toBe(true);

		const unnamed = await mountControl({
			versions: [version("v-2", "", { is_active: true })],
		});
		expect(status(unnamed.wrapper).text()).toMatch(/^Saved [^·]+$/);
	});

	it("names the source of an unnamed active restore while it's listed", async () => {
		const restore = version("v-4", "", {
			kind: "restore",
			source_version: "v-1",
			is_active: true,
		});
		const { wrapper } = await mountControl({
			versions: [restore, version("v-1", "Early stage")],
		});
		expect(status(wrapper).text()).toMatch(
			/^Saved .+ · from “Early stage”$/
		);

		const gone = await mountControl({ versions: [restore] });
		expect(status(gone.wrapper).text()).toMatch(/^Saved [^·]+$/);
	});

	it.each([
		[{ modified: true }, "Unsaved changes"],
		[
			{ modified: true, draftSavedAt: new Date(at(1)) },
			/^Unsaved · draft kept /,
		],
		[
			{
				modified: true,
				draftSavedAt: new Date(at(1)),
				draftResumed: true,
			},
			/^Unsaved · draft from /,
		],
		[{ modified: true, draftFailed: true }, "Draft not saved"],
		[
			{ modified: true, restoredFrom: version("v-9", "Early stage") },
			"Restored “Early stage” · unsaved",
		],
		[{ saving: true, modified: true }, "Saving…"],
		[{ failed: true, modified: true }, "Save failed"],
		[{ existing: false, modified: true }, "Unsaved changes"],
		[{ saveable: false, existing: false }, "Name your plan to create it"],
	])("says %o as %s", async (props, text) => {
		const { wrapper } = await mountControl(props);
		expect(status(wrapper).text()).toMatch(text);
	});

	it("offers Save, Retry or Create while there is something to save", async () => {
		const edited = await mountControl({ modified: true });
		const save = edited.wrapper.find("[data-save]");
		expect(save.text()).toBe("Save");
		await save.trigger("click");
		expect(edited.component.emitted("save")).toEqual([[""]]);

		const failed = await mountControl({ modified: true, failed: true });
		expect(failed.wrapper.find("[data-save]").text()).toBe("Retry save");
		expect(
			failed.wrapper
				.findAllComponents(PButton)
				.find((b) => b.attributes("data-save") !== undefined)!
				.props("type")
		).toBe("error");

		const created = await mountControl({ existing: false, modified: true });
		expect(created.wrapper.find("[data-save]").text()).toBe("Create");
		// a new plan has no versions: no menu, no popover
		expect(created.wrapper.find("[data-save-menu]").exists()).toBe(false);
	});

	it("undoes and redoes, off while read-only", async () => {
		const { wrapper, component } = await mountControl();
		const undo = wrapper.find("button[aria-label='Undo']");
		await undo.trigger("click");
		expect(component.emitted("undo")).toHaveLength(1);
		expect(
			wrapper.find("button[aria-label='Redo']").attributes("disabled")
		).toBeDefined();

		const preview = await mountControl({
			readOnly: true,
			preview: version("v-1", "Early stage"),
		});
		expect(
			preview.wrapper
				.find("button[aria-label='Undo']")
				.attributes("disabled")
		).toBeDefined();
		expect(status(preview.wrapper).text()).toBe("Viewing “Early stage”");
		expect(preview.wrapper.find("[data-save-menu]").exists()).toBe(false);
	});

	it("shows only undo and redo on a shared copy, and per part on a phone", async () => {
		const shared = await mountControl({ own: false, versioned: false });
		expect(status(shared.wrapper).exists()).toBe(false);
		expect(shared.wrapper.find("button[aria-label='Undo']").exists()).toBe(
			true
		);

		const header = await mountControl({ part: "history" });
		expect(status(header.wrapper).exists()).toBe(false);
		const bar = await mountControl({ part: "save", modified: true });
		expect(bar.wrapper.find("button[aria-label='Undo']").exists()).toBe(
			false
		);
		expect(bar.wrapper.find("[data-save]").exists()).toBe(true);
	});

	it("opens the versions from the status, retries a failed draft instead", async () => {
		const { wrapper } = await mountControl({ modified: true });
		await status(wrapper).trigger("click");
		await flushPromises();
		expect(body().find("[data-versions]").exists()).toBe(true);
		expect(trackEvent).toHaveBeenCalledWith("plan:history_open", {
			trigger: "button",
		});

		const failed = await mountControl({
			modified: true,
			draftFailed: true,
		});
		await status(failed.wrapper).trigger("click");
		expect(failed.component.emitted("retry-draft")).toHaveLength(1);

		// a new plan has no versions to open
		const created = await mountControl({
			existing: false,
			versioned: false,
		});
		await status(created.wrapper).trigger("click");
		expect(
			created.wrapper.findComponent(PlanVersionsPopover).exists()
		).toBe(false);
	});

	it("saves a named version from the menu, copies and discards there", async () => {
		const { wrapper, component } = await mountControl({ modified: true });
		await wrapper.find("[data-save-menu]").trigger("click");
		await flushPromises();
		const input = body().find(
			"input[aria-label='Version name (optional)']"
		);
		expect(document.activeElement).toBe(input.element);
		const submit = () =>
			body()
				.findAll("form button")
				.find((b) => b.attributes("type") === "submit")!;
		expect(submit().text()).toBe("Save");

		await input.setValue("  Late stage  ");
		expect(submit().text()).toBe("Save named");
		expect(body().text()).toContain("Kept until you remove the name");
		await input.trigger("keydown", { key: "Enter" });
		await submit().trigger("submit");
		expect(component.emitted("save")).toEqual([["Late stage"]]);

		await wrapper.find("[data-save-menu]").trigger("click");
		await flushPromises();
		await body()
			.findAll("button")
			.find((b) => b.text() === "Discard changes")!
			.trigger("click");
		expect(component.emitted("discard")).toHaveLength(1);

		await wrapper.find("[data-save-menu]").trigger("click");
		await flushPromises();
		await body()
			.findAll("button")
			.find((b) => b.text() === "Save as copy…")!
			.trigger("click");
		expect(component.emitted("save-as-copy")).toHaveLength(1);
	});

	it("can't discard without changes", async () => {
		const { wrapper } = await mountControl();
		await wrapper.find("[data-save-menu]").trigger("click");
		await flushPromises();
		const discard = body()
			.findAll("button")
			.find((b) => b.text() === "Discard changes")!;
		expect(discard.attributes("disabled")).toBeDefined();
	});
});

describe("PlanVersionsPopover", () => {
	async function openVersions(props: Record<string, unknown> = {}) {
		const mounted = await mountComponent(
			PlanVersionsPopover,
			{
				versions,
				modified: false,
				draftSavedAt: null,
				phone: false,
				show: true,
				...props,
			},
			{ messages: { plan }, attach: true }
		);
		await flushPromises();
		return mounted;
	}
	const rows = () =>
		body()
			.findAll("[data-version]")
			.map((r) => r.text().replace(/\s+/g, " "));
	// opens a row's menu, returns its items
	async function rowMenu(row: number): Promise<string[]> {
		const rowEl = body().findAll("[data-version]")[row];
		await rowEl.find("button[aria-haspopup='menu']").trigger("click");
		await flushPromises();
		return body()
			.findAll("[role=menuitem]")
			.map((i) => i.text());
	}
	async function pick(row: number, label: string): Promise<void> {
		await rowMenu(row);
		await body()
			.findAll("[role=menuitem]")
			.find((i) => i.text() === label)!
			.trigger("click");
		await flushPromises();
	}

	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("lists named versions and the active one, with the hidden count", async () => {
		await openVersions();
		expect(rows()).toHaveLength(2);
		expect(rows()[0]).toMatch(/^Late stage\s*Today .+Active$/);
		expect(rows()[1]).toContain("Restored from “Today");
		expect(body().text()).toContain(
			"Named versions stay. The last 10 unnamed are kept."
		);
		expect(body().text()).toContain("2 unnamed hidden");

		await body().find("input[type=checkbox]").setValue(false);
		expect(rows()).toHaveLength(4);
		expect(rows()[2]).toContain("Before version history");
		expect(body().text()).not.toContain("unnamed hidden");
	});

	it("puts the draft on top while there are unsaved changes", async () => {
		await openVersions({ modified: true, draftSavedAt: new Date(at(2)) });
		const draft = body().find("[data-draft-row]").text();
		expect(draft).toContain("Unsaved changes");
		expect(draft).toMatch(/Draft kept .+ · not in empires yet/);

		document.body.innerHTML = "";
		await openVersions({ modified: true });
		expect(body().find("[data-draft-row]").text()).toContain(
			"Not kept in a draft"
		);
	});

	it("renames in place: Enter saves, Escape cancels", async () => {
		const { component } = await openVersions();

		await pick(0, "Name this version");
		const input = body().find("input[aria-label='Version name']");
		expect(document.activeElement).toBe(input.element);
		await input.setValue("Final");
		await input.trigger("keydown", { key: "Enter" });
		expect(component.emitted("rename")).toEqual([["v-3", "Final"]]);

		await pick(0, "Name this version");
		await body()
			.find("input[aria-label='Version name']")
			.trigger("keydown", { key: "Escape" });
		expect(body().find("input[aria-label='Version name']").exists()).toBe(
			false
		);
		expect(component.emitted("rename")).toHaveLength(1);
	});

	it("offers make active and delete in the row menu, not on the active row", async () => {
		await openVersions();
		expect(
			body()
				.find("[data-version] button[aria-haspopup='menu']")
				.attributes("aria-label")
		).toBe("Actions for “Late stage”");
		expect(await rowMenu(0)).toEqual(["Name this version"]);

		document.body.innerHTML = "";
		await openVersions();
		expect(await rowMenu(1)).toEqual([
			"Name this version",
			"Make active",
			"Delete",
		]);
		expect(
			body()
				.findAll("[role=menuitem]")
				.find((i) => i.text() === "Delete")!
				.classes()
		).toContain("text-negative");
	});

	it("makes a version active and closes, deletes keeping the list open", async () => {
		const { component } = await openVersions();
		await pick(1, "Delete");
		expect(component.emitted("delete")).toEqual([["v-0"]]);
		expect(component.emitted("update:show")).toBeUndefined();

		await pick(1, "Make active");
		expect(component.emitted("activate")).toEqual([["v-0"]]);
		expect(component.emitted("update:show")).toEqual([[false]]);
	});

	it("passes make active and delete through the save control", async () => {
		const { wrapper, component } = await mountControl();
		const popover = wrapper.findComponent(PlanVersionsPopover);
		popover.vm.$emit("activate", "v-2");
		popover.vm.$emit("delete", "v-1");
		expect(component.emitted("activate")).toEqual([["v-2"]]);
		expect(component.emitted("delete")).toEqual([["v-1"]]);
	});

	it("has no axe violations with a row menu open", async () => {
		await openVersions();
		await rowMenu(1);
		const panels = [
			document.querySelector("[data-versions]"),
			document.querySelector("[role=menu]"),
		];
		for (const el of panels) {
			expect(el).not.toBeNull();
			const result = await axe.run(el!, {
				rules: { "color-contrast": { enabled: false } },
			});
			expect(
				result.violations.map(
					(v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`
				)
			).toEqual([]);
		}
	});

	it("previews a version and closes", async () => {
		const { component } = await openVersions();
		await body()
			.findAll("button[aria-label='Preview this version']")[1]
			.trigger("click");
		expect(component.emitted("preview")).toEqual([["v-0"]]);
		expect(component.emitted("update:show")).toEqual([[false]]);
	});

	it("is a bottom sheet on a phone", async () => {
		await openVersions({ phone: true });
		expect(body().find("[role=dialog]").exists()).toBe(true);
		expect(rows()).toHaveLength(2);
	});

	it("has no axe violations with the save menu and the versions open", async () => {
		const { wrapper } = await mountControl({ modified: true });
		await wrapper.find("[data-save-menu]").trigger("click");
		await status(wrapper).trigger("click");
		await flushPromises();
		expect(body().find("[data-versions]").exists()).toBe(true);

		// per element, as the kit's a11y test: the panels are teleported to
		// the body, outside the app's landmarks. jsdom has no layout, so
		// contrast is left to the e2e UI audit
		const panels = [
			wrapper.element,
			...document.querySelectorAll(
				"[aria-label='Save options'], [data-versions]"
			),
		];
		expect(panels).toHaveLength(4);
		for (const el of panels) {
			const result = await axe.run(el, {
				rules: { "color-contrast": { enabled: false } },
			});
			expect(
				result.violations.map(
					(v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`
				)
			).toEqual([]);
		}
	});
});
