import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";

import { usePlanVersions } from "@/features/planning/usePlanVersions";
import { mountComposable } from "@/tests/mountComponent";

const m = vi.hoisted(() => ({
	query: vi.fn(),
	state: { value: undefined as unknown },
	trackEvent: vi.fn(),
	reportError: vi.fn(),
	toast: vi.fn(),
	confirm: vi.fn(),
}));
vi.mock("@/lib/query_cache/useQuery", async () => {
	const { ref } = await import("vue");
	const state = ref<unknown>(undefined);
	m.state = state;
	return {
		useQuery: (name: string, args: unknown) => ({
			execute: () => m.query(name, args),
			state,
		}),
	};
});
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: m.trackEvent,
	reportError: m.reportError,
}));
vi.mock("@/ui/useToast", () => ({ useToast: () => m.toast }));
vi.mock("@/ui/useConfirm", () => ({ useConfirm: () => m.confirm }));

const pinia = createPinia();
const v1 = { uuid: "v-1", name: "", is_active: true };
const v2 = { uuid: "v-2", name: "Early", is_active: false, kind: "save" };

async function setup(enabled = true) {
	const on = ref(enabled);
	const { result } = await mountComposable(
		() =>
			usePlanVersions(
				() => "p-1",
				() => on.value
			),
		{ pinia }
	);
	return result;
}

describe("usePlanVersions", () => {
	beforeEach(() => {
		setActivePinia(pinia);
		vi.clearAllMocks();
		m.state.value = undefined;
		m.query.mockImplementation(async (name: string) =>
			name === "GetPlanVersions" ? [v1, v2] : { ...v1, name: "Late" }
		);
	});

	it("loads the list and follows its refetch after a save", async () => {
		const versions = await setup();
		await versions.load();
		expect(versions.refVersions.value).toEqual([v1, v2]);

		// invalidated: the last list stays until the new one is there
		m.state.value = undefined;
		await flushPromises();
		expect(versions.refVersions.value).toEqual([v1, v2]);
		m.state.value = { data: [v2] };
		await flushPromises();
		expect(versions.refVersions.value).toEqual([v2]);
	});

	it("loads nothing for a shared or new plan, and survives a failed load", async () => {
		const off = await setup(false);
		await off.load();
		expect(m.query).not.toHaveBeenCalled();

		const versions = await setup();
		m.query.mockRejectedValue(new Error("offline"));
		await versions.load();
		expect(m.reportError).toHaveBeenCalled();
		expect(versions.refVersions.value).toEqual([]);
	});

	it("renames in place, tracking a new name", async () => {
		const versions = await setup();
		await versions.load();
		await versions.rename("v-1", "  Late ");
		expect(m.query).toHaveBeenCalledWith("RenamePlanVersion", {
			planUuid: "p-1",
			versionUuid: "v-1",
			name: "Late",
		});
		expect(versions.refVersions.value[0].name).toBe("Late");
		expect(m.trackEvent).toHaveBeenCalledWith("plan:version_name", {
			from: "history",
		});

		m.query.mockRejectedValue(new Error("offline"));
		await versions.rename("v-1", "");
		expect(m.toast).toHaveBeenCalledWith("common.ui.save_failed", {
			type: "error",
		});
	});

	it("deletes after confirming, a version already gone included", async () => {
		const versions = await setup();
		await versions.load();
		const version = v2 as Parameters<typeof versions.remove>[0];

		m.confirm.mockResolvedValue(false);
		expect(await versions.remove(version)).toBe(false);
		expect(m.query).not.toHaveBeenCalledWith(
			"DeletePlanVersion",
			expect.anything()
		);
		expect(m.confirm).toHaveBeenCalledWith(
			expect.objectContaining({ content: "plan.versions.delete_confirm" })
		);

		m.confirm.mockResolvedValue(true);
		expect(await versions.remove(version)).toBe(true);
		expect(m.query).toHaveBeenCalledWith("DeletePlanVersion", {
			planUuid: "p-1",
			versionUuid: "v-2",
		});
		expect(versions.refVersions.value).toEqual([v1]);
		expect(m.trackEvent).toHaveBeenCalledWith("plan:version_delete", {
			named: true,
			kind: "save",
		});

		await versions.load();
		m.query.mockRejectedValueOnce(
			Object.assign(new Error("gone"), { status: 404 })
		);
		expect(await versions.remove(version)).toBe(true);
		expect(versions.refVersions.value).toEqual([v1]);
		expect(m.toast).not.toHaveBeenCalled();
	});

	it("keeps the version and reloads the list when a delete fails", async () => {
		const versions = await setup();
		await versions.load();
		m.confirm.mockResolvedValue(true);
		m.query.mockClear();
		m.query.mockRejectedValueOnce(
			Object.assign(new Error("active"), { status: 400 })
		);

		expect(
			await versions.remove(v2 as Parameters<typeof versions.remove>[0])
		).toBe(false);
		await flushPromises();

		expect(m.toast).toHaveBeenCalledWith("common.ui.delete_failed", {
			type: "error",
		});
		expect(m.reportError).toHaveBeenCalled();
		expect(m.query).toHaveBeenLastCalledWith("GetPlanVersions", {
			planUuid: "p-1",
		});
		expect(versions.refVersions.value).toEqual([v1, v2]);
	});

	it("renames nothing before the plan exists", async () => {
		const { result } = await mountComposable(
			() =>
				usePlanVersions(
					() => undefined,
					() => true
				),
			{ pinia }
		);
		await result.rename("v-1", "x");
		expect(m.query).not.toHaveBeenCalled();
	});
});
