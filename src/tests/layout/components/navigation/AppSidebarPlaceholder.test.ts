import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import AppSidebarPlaceholder from "@/layout/components/navigation/AppSidebarPlaceholder.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useUserStore } from "@/stores/userStore";

describe("AppSidebarPlaceholder", () => {
	it.each([
		["full", "w-62"],
		["collapsed", "w-16"],
	] as const)("takes the %s sidebar's width", async (style, width) => {
		const pinia = createPinia();
		setActivePinia(pinia);
		useUserStore().setPreference("layoutNavigationStyle", style);

		const { component } = await mountComponent(
			AppSidebarPlaceholder,
			{},
			{ pinia }
		);

		expect(component.classes()).toContain(width);
		expect(component.classes()).toEqual(
			expect.arrayContaining(["h-screen", "sticky", "shrink-0"])
		);
	});
});
