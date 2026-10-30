import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { Slots } from "vue";

import BaseROIView from "@/views/tools/BaseROIView.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

const { passThrough } = vi.hoisted(() => ({
	passThrough: (name: string, emitCX = false) => ({
		default: {
			name,
			emits: ["update:cx-uuid"],
			setup(
				_: unknown,
				{
					slots,
					emit,
				}: { slots: Slots; emit: (e: string, v: string) => void }
			) {
				if (emitCX) emit("update:cx-uuid", "cx-1");
				return () => slots.default?.();
			},
		},
	}),
}));
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader", true)
);
vi.mock("@/features/base_roi/components/BaseROIPage.vue", () => ({
	default: {
		name: "BaseROIPage",
		props: ["ready", "cxUuid"],
		setup(_: unknown, { slots }: { slots: Slots }) {
			return () => slots.loader?.();
		},
	},
}));

describe("BaseROIView", () => {
	it("is ready once the loaders render, with the loader's CX (criterion 1)", async () => {
		const { wrapper } = await mountComponent(BaseROIView);
		await flushPromises();
		const page = wrapper.findComponent({ name: "BaseROIPage" });
		expect(page.props("ready")).toBe(true);
		expect(page.props("cxUuid")).toBe("cx-1");
	});
});
