import { describe, it, expect, beforeEach, vi } from "vitest";
import { computed, defineComponent, h, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import {
	provideManageData,
	useManageData,
} from "@/features/manage/useManageData";

// Types & Interfaces
import type {
	IManageData,
	IManageSection,
} from "@/features/manage/useManageData.types";

const { responses } = vi.hoisted(() => ({
	responses: {} as Record<string, () => Promise<unknown>>,
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string) => ({ execute: () => responses[name]() }),
}));

function section(count: number, calls: string[], name: string) {
	const changedCount = ref(count);
	return {
		changedCount,
		section: {
			changedCount: computed(() => changedCount.value),
			save: vi.fn(async () => {
				calls.push(name);
				changedCount.value = 0;
			}),
			discard: vi.fn(),
		} satisfies IManageSection,
	};
}

/** ManageView with sections: assignments mounts first, as async ones can */
function mountWith(
	sections: Partial<Record<"empire" | "assignments", IManageSection>>
) {
	let data!: IManageData;
	const child = (name: "empire" | "assignments") =>
		defineComponent({
			setup() {
				const s = sections[name];
				if (s) useManageData().register(name, s);
				return () => null;
			},
		});
	const show = ref(true);
	const wrapper = mount(
		defineComponent({
			setup() {
				data = provideManageData();
				return () =>
					show.value
						? [h(child("assignments")), h(child("empire"))]
						: null;
			},
		})
	);
	return { data: () => data, wrapper, show };
}

describe("useManageData", () => {
	beforeEach(() => {
		responses.GetAllCX = async () => [{ uuid: "cx-1" }];
		responses.GetAllEmpires = async () => [{ uuid: "e-1" }];
		responses.GetAllPlans = async () => [{ uuid: "p-1" }];
	});

	it("needs ManageView to provide it", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(() =>
			mount(
				defineComponent({
					setup() {
						useManageData();
						return () => null;
					},
				})
			)
		).toThrow("useManageData needs provideManageData");
		warn.mockRestore();
	});

	it("counts all sections and saves CX first, only changed ones", async () => {
		const calls: string[] = [];
		const empire = section(1, calls, "empire");
		const matrix = section(2, calls, "assignments");
		const unchanged = section(0, calls, "assignments");
		const { data } = mountWith({
			empire: empire.section,
			assignments: matrix.section,
		});
		expect(data().totalChanged.value).toBe(3);

		await data().saveSections();
		expect(calls).toEqual(["empire", "assignments"]);
		expect(data().totalChanged.value).toBe(0);

		// a section registering again replaces itself
		data().register("assignments", unchanged.section);
		await data().saveSections();
		expect(unchanged.section.save).not.toHaveBeenCalled();
	});

	it("stops at a failed save, the saved part has nothing left", async () => {
		const calls: string[] = [];
		const empire = section(1, calls, "empire");
		const matrix = section(2, calls, "assignments");
		matrix.section.save.mockRejectedValueOnce(new Error("500"));
		const { data } = mountWith({
			empire: empire.section,
			assignments: matrix.section,
		});

		await expect(data().saveSections()).rejects.toThrow("500");
		expect(data().totalChanged.value).toBe(2);
		await data().saveSections();
		expect(empire.section.save).toHaveBeenCalledTimes(1);
		expect(matrix.section.save).toHaveBeenCalledTimes(2);
	});

	it("discards every section and shows the first detail", () => {
		const empire = section(1, [], "empire");
		const matrix = section(1, [], "assignments");
		const detail = computed(() => "2 plans");
		const { data } = mountWith({
			empire: empire.section,
			assignments: { ...matrix.section, detail },
		});
		expect(data().saveDetail.value).toBe("2 plans");

		data().discardSections();
		expect(empire.section.discard).toHaveBeenCalled();
		expect(matrix.section.discard).toHaveBeenCalled();
	});

	it("drops a section when it unmounts", async () => {
		const empire = section(4, [], "empire");
		const { data, show } = mountWith({ empire: empire.section });
		expect(data().totalChanged.value).toBe(4);

		show.value = false;
		await flushPromises();
		expect(data().totalChanged.value).toBe(0);
	});

	it("reloads CX, empires, and plans together with their empires", async () => {
		const { data } = mountWith({});
		await data().refetchCX();
		await data().refetchEmpires();
		expect(data().cxList.value).toEqual([{ uuid: "cx-1" }]);
		expect(data().empireList.value).toEqual([{ uuid: "e-1" }]);

		responses.GetAllEmpires = async () => [{ uuid: "e-2" }];
		await data().refetchPlans();
		expect(data().planList.value).toEqual([{ uuid: "p-1" }]);
		expect(data().empireList.value).toEqual([{ uuid: "e-2" }]);

		// both lists or neither
		responses.GetAllEmpires = async () => {
			throw new Error("500");
		};
		responses.GetAllPlans = async () => [{ uuid: "p-2" }];
		await expect(data().refetchPlans()).rejects.toThrow("500");
		expect(data().planList.value).toEqual([{ uuid: "p-1" }]);
	});
});
