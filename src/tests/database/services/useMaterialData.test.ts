import { ref } from "vue";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the materials store
vi.mock("@/database/stores", () => ({
	materialsStore: {},
}));

// Mock useDB
vi.mock("@/database/composables/useDB", () => ({
	useDB: vi.fn(),
}));

import { useDB } from "@/database/composables/useDB";
import { useMaterialData } from "@/database/services/useMaterialData";

// Sample materials
const mockMaterial1 = {
	ticker: "MAT1",
	name: "Material One",
	category_name: "foo",
};
const mockMaterial2 = {
	ticker: "MAT2",
	name: "Material Two",
	category_name: "moo",
};

describe("useMaterialData, no data", async () => {
	let getMock: any;
	let preloadMock: any;

	beforeEach(() => {
		preloadMock = vi.fn(async () => {});

		// @ts-ignore
		useDB.mockReturnValue({
			allData: ref(undefined),
			get: getMock,
			preload: preloadMock,
		});
	});

	it("trigger preload", async () => {
		const { preload } = useMaterialData();
		await preload();
		expect(preloadMock).toHaveBeenCalled();
	});

	it("empty materialsMap", async () => {
		const { materialsMap } = useMaterialData();
		expect(materialsMap.value).toStrictEqual({});
	});

	it("empty materialSelectOptions", async () => {
		const { materialSelectOptions } = useMaterialData();
		expect(materialSelectOptions.value).toStrictEqual([]);
	});
});

describe("useMaterialData", () => {
	let getMock: any;
	let preloadMock: any;

	beforeEach(() => {
		getMock = vi.fn(async (ticker: string) => {
			if (ticker === mockMaterial1.ticker) return mockMaterial1;
			if (ticker === mockMaterial2.ticker) return mockMaterial2;
			return undefined;
		});

		preloadMock = vi.fn(async () => {});

		// @ts-ignore
		useDB.mockReturnValue({
			allData: ref([mockMaterial1, mockMaterial2]),
			get: getMock,
			preload: preloadMock,
		});
	});

	it("getMaterial returns the correct material", async () => {
		const { getMaterial } = useMaterialData();
		const material = await getMaterial("MAT1");
		expect(material.name).toBe("Material One");
		expect(getMock).toHaveBeenCalledWith("MAT1");
	});

	it("getMaterial throws an error if material not found", async () => {
		const { getMaterial } = useMaterialData();
		await expect(getMaterial("UNKNOWN")).rejects.toThrow(
			"Material UNKNOWN not available."
		);
	});

	it("materialSelectOptions is computed correctly", () => {
		const { materialSelectOptions } = useMaterialData();
		const options = materialSelectOptions.value;

		expect(options).toEqual([
			{ label: "MAT1", value: "MAT1" },
			{ label: "MAT2", value: "MAT2" },
		]);
	});

	it("getMaterialClass", async () => {
		const { getMaterialClass } = useMaterialData();

		expect(getMaterialClass("MAT1")).toBe("material-category-foo");
	});

	it("reload calls preload", async () => {
		const { preload } = useMaterialData();
		await preload();
		expect(preloadMock).toHaveBeenCalled();
	});
});
