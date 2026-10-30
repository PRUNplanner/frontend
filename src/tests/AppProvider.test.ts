import { describe, it, expect, vi, beforeEach } from "vitest";
import { unref } from "vue";
import { createPinia, setActivePinia } from "pinia";

import AppProvider from "@/AppProvider.vue";
import { mountComponent } from "@/tests/mountComponent";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);
const route = vi.hoisted(() => ({
	path: "/",
	meta: {} as { indexable?: boolean },
}));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRoute: () => route,
}));
vi.mock("@/App.vue", () => ({ default: { render: () => null } }));

interface Head {
	titleTemplate: (title?: string) => string;
	htmlAttrs: { lang: unknown };
	meta: { name: string; content: () => string | undefined }[];
	link: unknown;
}

async function mountHead(path: string, indexable?: boolean): Promise<Head> {
	route.path = path;
	route.meta = { indexable };
	setActivePinia(createPinia());
	await mountComponent(AppProvider);
	return head.useHead.mock.lastCall![0];
}

const meta = (h: Head, name: string) =>
	h.meta.find((m) => m.name === name)!.content();

describe("AppProvider head", () => {
	beforeEach(() => head.useHead.mockClear());

	it("adds the site name to every page title, and is the site name alone", async () => {
		const h = await mountHead("/empire");

		expect(h.titleTemplate("Empire")).toBe("Empire · PRUNplanner");
		expect(h.titleTemplate(undefined)).toBe("PRUNplanner");
	});

	it("follows the locale in <html lang> and sets the site description", async () => {
		const h = await mountHead("/");

		expect(unref(h.htmlAttrs.lang)).toBe("en-US");
		expect(meta(h, "description")).toBe("homepage.seo.description");
	});

	it("gives an indexable page its canonical URL and no robots tag", async () => {
		const h = await mountHead("/imprint-tos", true);

		expect(meta(h, "robots")).toBeUndefined();
		expect(unref(h.link)).toEqual([
			{ rel: "canonical", href: "https://prunplanner.org/imprint-tos" },
		]);
	});

	it("keeps every other page out of the index, without a canonical", async () => {
		const h = await mountHead("/shared/abc");

		expect(meta(h, "robots")).toBe("noindex");
		expect(unref(h.link)).toEqual([]);
	});
});
